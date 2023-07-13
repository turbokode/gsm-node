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
    const response = await executeCommand("AT");
    if (response.length > 0) status.gsm = true;

    res.json({ message: "success", data: status });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    /**
     * Geral log do erro e enviar uma notificação para o admin!
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
const sendSMSQueue = new MessageQueue();
let newMessageQueue = new Array<string>();
let isSendingSMS = false;
let isExecutingCommand = false;
let responses: string[] = [];
let executingCommand = "";
let commandReceived = false;

setInterval(async () => {
  if (!isSendingSMS && !isExecutingCommand) {
    await getUnreadMessages();
  }
}, 30000);

port.on("open", async () => {
  console.log("Serial port is open!");

  //Test and config the GSM serial communication
  await gsmConfig();

  await getUnreadMessages();
});

async function getUnreadMessages(): Promise<string[]> {
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
    const splited = message.split(",");
    return splited[0].replace("+CMGL: ", '+CMTI: "SM",');
  });
  newMessageQueue.push(...queues);

  processNextMessage();

  return returnedUnreadMessages;
}

port.on("error", (err) => {
  if (err) console.log("Error on serial port: ", err.message);
});

function executeCommand(command: string): Promise<string[]> {
  console.log("EXECUTING: ", command);
  isExecutingCommand = true;
  executingCommand = command;
  responses = [];

  return new Promise((resolve, reject) => {
    const timeOut = setTimeout(() => {
      clearTimeout(timeOut);
      console.log("The GSM module is not responding!");
      resolve([]);
    }, 65000);

    port.write(`${command}\r\n`, async (err) => {
      if (err) {
        console.log(`Error when execute ${command}: ${err.message}`);
        clearTimeout(timeOut);
        await resetGSM(port, parser, gsmConfig);
        reject(false);
      }
    });

    let isExecuted = false;
    const interval = setInterval(() => {
      const okRes = !!responses.find((res) => res === "OK");
      const isCurrentCommand = !!responses.find(
        (res) => res.replace("\r", "") === command
      );

      if (okRes && isCurrentCommand) isExecuted = true;

      if (isExecuted) {
        clearTimeout(timeOut);
        clearInterval(interval);
        console.log("Command Executed!");

        resolve(responses);
      }
    }, 500);
  });
}

parser.on("data", (data) => {
  console.log("GSM MESSAGE: ", data);
  if (isExecutingCommand) onExecuteCommand(data);
  if (data.startsWith("+CMTI:")) newSMS(data);
});

function newSMS(gsmMessage: string) {
  console.log("Nova mensagem recebida: ", gsmMessage);

  if (newMessageQueue.length > 0) newMessageQueue.push(gsmMessage);

  if (newMessageQueue.length == 0) {
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

  if (!isStringEmpty(newUserMessage.phoneNumber)) {
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

        console.log("Message Enviada: ", response.data);
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

  const gsmResponse = await executeCommand(`AT+CMGR=${index}`);

  await executeCommand(`AT+CMGD=${index}`);

  const userMessage = processUserMessage(gsmResponse);

  return userMessage;
}

function addToSendQueue(phoneNumber: string, message: string) {
  console.log("Add to queue: ", phoneNumber);
  sendSMSQueue.set({ phoneNumber, message, sendState: false });

  if (isSendingSMS) return;

  sendSMSManager();
}

async function sendSMSManager() {
  const toSendMessage = sendSMSQueue.getNext();
  console.log("QUEUE MESSAGES: ", sendSMSQueue.getAll());

  if (toSendMessage) {
    try {
      await sendSMS(toSendMessage.phoneNumber, toSendMessage.message);
      const result = sendSMSQueue.update({ ...toSendMessage, sendState: true });

      console.log("UPDATE RESULT: ", result);
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

function sendSMS(phoneNumber: string, msg: string): Promise<boolean> {
  isSendingSMS = true;

  return new Promise((resolve, reject) => {
    const message = removeAccents(msg);
    const endMessageIndicator = Buffer.from([26]);

    const sendIDRegex = /\+CMGS: (\d+)/;

    let sendCommandExecuted = false;
    const onData = async (data: string) => {
      console.log("SEND: ", data);
      if (sendIDRegex.test(data)) sendCommandExecuted = true;

      if (sendCommandExecuted && data === "OK") {
        console.log("Mensagem enviada com sucesso!");
        parser.removeListener("data", onData);
        isSendingSMS = false;

        port.write(`AT+CMGDA="DEL SENT"\r\n`);

        setTimeout(() => {
          resolve(true);
        }, 500);
      } else if (data.includes("ERROR")) {
        console.error("Erro no envio da mensagem:", data);
        parser.removeListener("data", onData);
        isSendingSMS = false;

        await resetGSM(port, parser, gsmConfig);

        setTimeout(() => {
          reject(false);
        }, 500);
      }
    };

    parser.on("data", onData);

    setTimeout(function () {
      // Comando AT para enviar a mensagem
      port.write(`AT+CMGS= "+258${phoneNumber}"\r\n`);

      setTimeout(() => {
        port.write(`${message}`);
      }, 500);

      setTimeout(() => {
        port.write(`${endMessageIndicator}\r\n`, (error) => {
          if (error) {
            reject(error);
            return;
          }
        });
      }, 500);
    }, 2000);
  });
}

async function gsmConfig() {
  await executeCommand("AT");
  await executeCommand("AT+CMGF=1");
  await executeCommand(`AT+CMGDA="DEL READ"`);
  await executeCommand(`AT+CSCS="8859-1"`);
}

const onExecuteCommand = async (data: string) => {
  console.log("ON_EXECUTE_COMMAND: ", data);

  if (data.replace("\r", "") === executingCommand) commandReceived = true;

  if (commandReceived) responses.push(data);

  if (commandReceived && data === "OK") {
    /**
     * Remove command form DB
     */
    console.log(`${executingCommand}: Success`);
    isExecutingCommand = false;
    commandReceived = false;
    executingCommand = "";
  }
  if (commandReceived && data === "ERROR") {
    console.log(`${executingCommand}: Error`);
    isExecutingCommand = false;
    commandReceived = false;
    executingCommand = "";

    await resetGSM(port, parser, gsmConfig);
  }
};
