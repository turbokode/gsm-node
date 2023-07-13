import { AxiosError } from "axios";
import { isBefore } from "date-fns";
import express from "express";
import { ReadlineParser, SerialPort } from "serialport";
import { api } from "./api/server";
import { MessageQueue } from "./resources/MessageQueue";
import expirationDate from "./resources/expirationDate";
import { isStringEmpty } from "./resources/isEmpty";
import { processUserMessage } from "./resources/processUserMessage";
import { removeAccents } from "./resources/removeAccents";
import { resetGSM } from "./resources/resetGSM";

const app = express();

const serverPort = 3001;

app.use(express.json());

app.post("/send_sms", async (req, res) => {
  const { phoneNumber, message } = req.body;

  try {
    if (isStringEmpty(phoneNumber)) throw new Error("Phone number is empty!");
    if (isStringEmpty(message)) throw new Error("Message content is empty!");

    addToSendQueue(phoneNumber, message);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    /**
     * Geral log do erro e enviar uma notificação para o admin!
     */

    res.status(500).json({ message: err });
  }
});

app.get("/check_sys", async (req, res) => {
  let status = { server: true, gsm: false };

  try {
    await executeCommand("AT");
    if (responses.includes("AT\r") && responses.includes("OK"))
      status.gsm = true;

    res.json({ message: "success", data: status });
  } catch (err) {
    console.log(err);
    /**
     * Gerar log do erro e enviar uma notificação para o admin!
     */

    res.status(500).json({ message: err });
  }
});

app.listen(serverPort, () => {
  console.log(`🚀 The Smart_Pump sys is running in ${serverPort} port!`);
});

// Create a port
const port = new SerialPort({ path: "/dev/serial0", baudRate: 115200 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

/* ============== USER COMMUNICATION SYSTEM ============== */
let newMessageQueue = new Array<string>();
const sendSMSQueue = new MessageQueue();
let commandExecutionsCounter = 0;
let isExecutingCommand = false;
let responses: string[] = [];
let commandReceived = false;
let executingCommand = "";
let isSendingSMS = false;

port.on("open", async () => {
  console.log("Serial port is open!");

  await gsmConfig();

  await getUnreadMessages();
});

port.on("error", (err) => {
  if (err) console.log("Error on serial port: ", err.message);
});

parser.on("data", (data) => {
  console.log("GSM MESSAGE: ", data);
  if (isExecutingCommand) onExecuteCommand(data);
  if (data.startsWith("+CMTI:")) newSMS(data);
});

async function onExecuteCommand(data: string) {
  // console.log("EXECUTE LISTENER: ", data);

  if (data.replace("\r", "") === executingCommand) commandReceived = true;

  if (commandReceived) responses.push(data);

  if (commandReceived && data === "OK") {
    /**
     * Remove command form DB
     */
    console.log(`${executingCommand}: SUCCESS EXECUTED!`);
    isExecutingCommand = false;
    commandReceived = false;
    executingCommand = "";
  }
  if (commandReceived && data === "ERROR") {
    console.log(`${executingCommand}: ERROR`);
    commandReceived = false;
    executingCommand = "";

    await resetGSM(port, parser, gsmConfig);
    isExecutingCommand = false;
  }
}

function executeCommand(command: string) {
  console.log("EXECUTING: ", command);
  commandExecutionsCounter++;
  isExecutingCommand = true;
  executingCommand = command;
  responses = [];

  return new Promise((resolve, reject) => {
    let isExecuted = false;
    const interval = setInterval(async () => {
      const isCurrentCommand = !!responses.find(
        (res) => res.replace("\r", "") === command
      );
      const okRes = !!responses.find((res) => res === "OK");

      if (okRes && isCurrentCommand) isExecuted = true;

      if (isExecuted) {
        commandExecutionsCounter = 0;
        clearTimeout(timeOut);
        clearInterval(interval);

        resolve(`${command} COMMAND EXECUTED!`);
      }
    }, 500);

    const timeOut = setTimeout(async () => {
      clearTimeout(timeOut);
      clearInterval(interval);

      console.log("The GSM module is not responding!");

      await executeCommand(command)
        .catch((err) => reject(err))
        .then((res) => resolve(res));

      if (commandExecutionsCounter >= 3) {
        commandExecutionsCounter = 0;
        reject("The GSM module is not responding!");
      }
    }, 65000);

    port.write(`${command}\r\n`, async (err) => {
      if (err) {
        clearTimeout(timeOut);
        clearInterval(interval);

        await resetGSM(port, parser, gsmConfig);

        await executeCommand(command)
          .catch((err) => reject(err))
          .then((res) => resolve(res));

        if (commandExecutionsCounter >= 5) {
          commandExecutionsCounter = 0;
          reject(`Error when execute ${command}: ${err.message}`);
        }
      }
    });
  });
}

setInterval(async () => {
  if (!isSendingSMS && !isExecutingCommand) {
    await getUnreadMessages();
  }
}, 30000);

async function getUnreadMessages() {
  const returnedUnreadMessages = await new Promise<string[]>(
    (resolve, reject) => {
      let unreadMessages = new Array<string>();
      let commandReceived = false;
      const selectUnreadMessageRegex = /\+CMGL: (\d+),"REC UNREAD"/;

      port.write('AT+CMGL="REC UNREAD"\r\n', async (err) => {
        if (err) {
          reject([]);

          await resetGSM(port, parser, gsmConfig);
        }
      });

      const onData = (data: string) => {
        if (data.replace("\r", "") === 'AT+CMGL="REC UNREAD"')
          commandReceived = true;

        if (selectUnreadMessageRegex.test(data)) {
          unreadMessages.push(data);
        } else if (data === "OK" && commandReceived) {
          parser.removeListener("data", onData);
          resolve(unreadMessages);
        }
      };

      parser.on("data", onData);
    }
  );

  const queues = returnedUnreadMessages.map((message: string) => {
    const splitted = message.split(",");
    return splitted[0].replace("+CMGL: ", '+CMTI: "SM",');
  });
  newMessageQueue.push(...queues);

  processNextMessage();

  return returnedUnreadMessages;
}

function newSMS(gsmMessage: string) {
  console.log("NEW SMS: ", gsmMessage);

  if (newMessageQueue.length > 0) newMessageQueue.push(gsmMessage);

  if (newMessageQueue.length === 0) {
    newMessageQueue.push(gsmMessage);
    processNextMessage();
  }
}

async function processNextMessage() {
  console.log("newMessageQueue.length", newMessageQueue.length);

  if (newMessageQueue.length === 0 || isSendingSMS) {
    return;
  }

  const message = newMessageQueue.shift();

  if (!message) {
    console.error("NOT MESSAGE FOUND ON QUEUE");
    return;
  }

  const newUserMessage = await getNewUserMessage(message);

  if (newUserMessage && !isStringEmpty(newUserMessage.phoneNumber)) {
    console.log("USER MESSAGE: ", newUserMessage);

    const passedTime = expirationDate({
      date: newUserMessage.date!,
      minutes: 15,
    });

    if (isBefore(new Date(), passedTime)) {
      const message =
        "Desculpa a sua solicitação esgotou o tempo de processamento, por favor volte a tentar novamente!";

      addToSendQueue(newUserMessage.phoneNumber, message);
    } else {
      try {
        const response = await api.post("/system_gate_way", {
          phoneNumber: newUserMessage.phoneNumber,
          content: newUserMessage.content,
        });

        console.log("POST TO SERVER EXECUTED: ", response.data);
      } catch (error) {
        const err = error as AxiosError;

        console.log("POST ERROR: ", err.message);
        const message =
          "Desculpa um error inesperado foi verificado no sistema, por favor volte a tentar mais tarde.\n Caso o problema persista entre em contacto através do numero: +258824116651.\n\nEstamos a trabalhar arduamente para resolver o problema.";

        addToSendQueue(newUserMessage.phoneNumber, message);
      }
    }
  }

  await getUnreadMessages();
}

async function getNewUserMessage(line: string) {
  const index = line.split(",")[1].trim();

  try {
    await executeCommand(`AT+CMGR=${index}`);

    const userMessage = processUserMessage(responses);

    await executeCommand(`AT+CMGD=${index}`);

    return userMessage;
  } catch (error) {
    console.log(error);
  }
}

function addToSendQueue(phoneNumber: string, message: string) {
  sendSMSQueue.set({ phoneNumber, message, sendState: false });

  if (isSendingSMS) return;

  sendSMSManager();
}

async function sendSMSManager() {
  const toSendMessage = sendSMSQueue.getNext();
  console.log("QUEUED MESSAGES: ", sendSMSQueue.getAll());

  if (toSendMessage) {
    try {
      await sendSMS(toSendMessage.phoneNumber, toSendMessage.message).then(
        (res) => console.log(res)
      );
      sendSMSQueue.update({ ...toSendMessage, sendState: true });
      console.log("MENSAGEM ENVIADA!");
    } catch (error) {
      console.log(
        `Failed when try to send SMS to ${toSendMessage.phoneNumber}: `,
        error
      );
      /**
       * Save log
       */
    }

    sendSMSManager();
  }
}

function sendSMS(phoneNumber: string, msg: string) {
  isSendingSMS = true;

  return new Promise((resolve, reject) => {
    const sendIDRegex = /\+CMGS: (\d+)/;
    const message = removeAccents(msg);
    const endMessageIndicator = Buffer.from([26]);

    let sendCommandExecuted = false;
    const onData = async (data: string) => {
      console.log("SEND: ", data);
      if (sendIDRegex.test(data)) sendCommandExecuted = true;

      if (sendCommandExecuted && data === "OK") {
        parser.removeListener("data", onData);
        isSendingSMS = false;

        port.write(`AT+CMGDA="DEL SENT"\r\n`);

        setTimeout(() => {
          resolve("SMS SENT SUCCESSFULLY!");
        }, 500);
      } else if (data.includes("ERROR")) {
        parser.removeListener("data", onData);

        await resetGSM(port, parser, gsmConfig);
        isSendingSMS = false;

        console.log(`ERROR WHEN TRY SEND SMS: ${data}`);

        reject(`ERROR WHEN TRY SEND SMS: ${data}`);
      }
    };

    parser.on("data", onData);

    setTimeout(function () {
      port.write(`AT+CMGS= "+258${phoneNumber}"\r\n`);

      setTimeout(() => {
        port.write(`${message}`);
      }, 1000);

      setTimeout(() => {
        port.write(`${endMessageIndicator}\r\n`, (error) => {
          if (error) {
            reject(error);
            return;
          }
        });
      }, 1000);
    }, 1000);
  });
}

async function gsmConfig() {
  try {
    await executeCommand("AT").then((res) => console.log(res));
    await executeCommand("AT+CMGF=1").then((res) => console.log(res));
    await executeCommand(`AT+CMGDA="DEL READ"`).then((res) => console.log(res));
    await executeCommand(`AT+CSCS="8859-1"`).then((res) => console.log(res));
  } catch (error) {
    console.log(error);
  }
}
