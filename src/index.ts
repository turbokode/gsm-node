import { AxiosError } from "axios";
import cors from "cors";
import { isAfter } from "date-fns";
import "dotenv/config";
import express from "express";
import { ReadlineParser, SerialPort } from "serialport";
import { INewSMSQueue, MessageType } from "./@types/app";
import { api } from "./api/server";
import { MessageQueue } from "./resources/MessageQueue";
import expirationDate from "./resources/expirationDate";
import { isEmpty, isStringEmpty } from "./resources/isEmpty";
import { isValidPhoneNumber } from "./resources/isValidValue";
import { notifications } from "./resources/notifications";
import { processUserMessage } from "./resources/processUserMessage";
import { removeAccents } from "./resources/removeAccents";
import { resetGSM } from "./resources/resetGSM";

const app = express();

const serverPort = process.env.PORT;

app.use(express.json());
app.use(cors());

app.post("/send_sms", async (req, res) => {
  const { phoneNumber, message } = req.body;

  isExecutingAPIRequest = true;

  console.log("SEND SMS REQUEST: ", { phoneNumber, message });

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
  } finally {
    isExecutingAPIRequest = false;
  }
});

app.get("/check_sys", async (req, res) => {
  let status = { server: true, gsm: false };

  isExecutingAPIRequest = true;

  try {
    await executeCommand("AT");
    if (responses.includes("AT\r") && responses.includes("OK"))
      status.gsm = true;

    res.json({ message: "success", data: status });
  } catch (err) {
    console.log(err);
    await notifications("BAD_REQUEST");

    res.status(500).json({ message: err });
  } finally {
    isExecutingAPIRequest = false;
  }
});

app.get("/check_device", async (req, res) => {
  const { deviceSIMNumber, checkCode } = req.params as unknown as {
    deviceSIMNumber: string;
    checkCode: string;
  };

  isExecutingAPIRequest = true;

  try {
    if (isEmpty(deviceSIMNumber))
      throw new Error("The Phone number cannot be null!");
    if (isValidPhoneNumber(deviceSIMNumber, "ALL"))
      throw new Error("Invalid phone number!");
    if (isEmpty(checkCode)) throw new Error("The check code cannot be null!");

    addToSendQueue(deviceSIMNumber, checkCode);

    return res.json({ message: "success" });
  } catch (err) {
    console.log(err);
    await notifications("BAD_REQUEST");

    res.status(500).json({ message: err });
  } finally {
    isExecutingAPIRequest = false;
  }
});

app.listen(serverPort, async () => {
  console.log(`🚀 The SMS server is running in ${serverPort} port!`);
});

// Create a port
const port = new SerialPort({ path: "/dev/serial0", baudRate: 115200 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

/* ============== USER COMMUNICATION SYSTEM ============== */
let lastSentMessage: MessageType | undefined = undefined;
let newSMSQueue = new Array<INewSMSQueue>();
const sendSMSQueue = new MessageQueue();
let commandExecutionsCounter = 0;
let isExecutingCommand = false;
let isExecutingAPIRequest = false;
let responses: string[] = [];
let tryToSendSMSCounter = 0;
let commandReceived = false;
let executingCommand = "";
let isSendingSMS = false;

port.on("open", initializeGSM);

parser.on("data", handleData);

port.on("error", (err) => {
  if (err) console.log("Error on serial port: ", err.message);
});

async function onExecuteCommand(data: string) {
  if (data.replace("\r", "") === executingCommand) commandReceived = true;

  if (commandReceived) responses.push(data);

  if (commandReceived && data === "OK") {
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

      await resetGSM(port, parser, gsmConfig);

      await executeCommand(command)
        .catch((err) => reject(err))
        .then((res) => resolve(res));

      if (commandExecutionsCounter >= 3) {
        commandExecutionsCounter = 0;
        reject("The GSM module is not responding!");
      }
    }, 60000);

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

      const onData = async (data: string) => {
        if (data.replace("\r", "") === 'AT+CMGL="REC UNREAD"')
          commandReceived = true;

        if (selectUnreadMessageRegex.test(data)) {
          unreadMessages.push(data);
        } else if (data === "OK" && commandReceived) {
          parser.removeListener("data", onData);
          resolve(unreadMessages);
        } else if (data === "ERROR" && commandReceived) {
          parser.removeListener("data", onData);

          // await resetGSM(port, parser, gsmConfig);

          // await notifications("GSM_OFF")
        }
      };

      parser.on("data", onData);
    }
  );

  const queues = returnedUnreadMessages.map((message: string) => {
    const splitted = message.split(",");
    return {
      indicator: splitted[0].replace("+CMGL: ", '+CMTI: "SM",'),
      isExecuted: false,
    };
  });
  newSMSQueue.push(...queues);

  processNextMessage();

  return returnedUnreadMessages;
}

function newSMS(gsmMessage: string) {
  console.log("NEW USER SMS");
  restartAllSystemTimer.refresh();
  tryToSendSMSCounter = 0;

  newSMSQueue.push({ indicator: gsmMessage, isExecuted: false });

  if (newSMSQueue.length === 1) processNextMessage();
}

let processNewSMSIndex = -1;
async function processNextMessage() {
  console.log("Nex SMS index: ", processNewSMSIndex);
  console.log("newSMSQueue: ", newSMSQueue);

  if (newSMSQueue.length === 0 || isSendingSMS) {
    return;
  }

  processNewSMSIndex++;
  const message = newSMSQueue[processNewSMSIndex];

  if (!message) {
    processNewSMSIndex = -1;
    console.error("NOT MESSAGE FOUND ON QUEUE");
    return;
  }

  if (message.isExecuted) {
    processNextMessage();
    return;
  }

  const res = await getNewUserMessage(message.indicator);
  const newUserMessage = res?.userMessage;
  const index = res?.index;

  if (newUserMessage && !isStringEmpty(newUserMessage.phoneNumber)) {
    newSMSQueue[processNewSMSIndex].isExecuted = true;
    await executeCommand(`AT+CMGD=${index}`); //Delete SMS

    console.log("USER MESSAGE: ", newUserMessage);

    const passedTime = expirationDate({
      date: newUserMessage.date!,
      minutes: 15,
    });

    if (isAfter(new Date(), passedTime)) {
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
        addToSendQueue(newUserMessage.phoneNumber, "Aguarde ...");
      } catch (error) {
        const err = error as AxiosError;

        console.log("POST ERROR: ", err.message);
        const message = `Erro no sistema, tente novamente.\n\nSe persistir, contate-nos: ${process.env.ALERT_PHONE_NUMBER}.\nEstamos trabalhando para resolver.`;

        addToSendQueue(newUserMessage.phoneNumber, message);
      }
    }
  }
}

async function getNewUserMessage(line: string) {
  const index = line.split(",")[1].trim();

  try {
    await executeCommand(`AT+CMGR=${index}`); //GET SMS

    const userMessage = processUserMessage(responses);

    return { userMessage, index };
  } catch (error) {
    console.log(error);
  }
}

function addToSendQueue(phoneNumber: string, message: string) {
  console.log("ADD TO QUEUE: ", { phoneNumber, message });
  sendSMSQueue.set({
    phoneNumber,
    message,
    sendState: false,
  });

  if (isSendingSMS) return;

  sendSMSManager();
}

async function sendSMSManager() {
  const toSendMessage = sendSMSQueue.getNext();

  if (toSendMessage && !toSendMessage.sendState && tryToSendSMSCounter < 2) {
    if (lastSentMessage === toSendMessage) tryToSendSMSCounter++;
    lastSentMessage = toSendMessage;

    try {
      await sendSMS(toSendMessage.phoneNumber, toSendMessage.message).then(
        (res) => console.log(res)
      );
      sendSMSQueue.update({ ...toSendMessage, sendState: true });
    } catch (error) {
      console.log(
        `Failed when try to send SMS to ${toSendMessage.phoneNumber}: `,
        error
      );

      await notifications("SMS_LOS");
    }

    sendSMSManager();
  }
}

async function sendSMS(phoneNumber: string, msg: string) {
  isSendingSMS = true;
  checkUnreadMessageInterval.refresh();

  await executeCommand('AT+CSCS="GSM"');

  return new Promise((resolve, reject) => {
    const sendIDRegex = /\+CMGS: (\d+)/;
    const message = removeAccents(msg);
    const endMessageIndicator = Buffer.from([26]);

    let sendCommandExecuted = false;
    const onData = async (data: string) => {
      console.log("SEND: ", data);

      if (sendIDRegex.test(data)) sendCommandExecuted = true;

      if (data.startsWith(">")) {
        port.write(`${message + endMessageIndicator}\r\n`, (error) => {
          if (error) {
            reject(error);
            return;
          }
        });
      }

      if (sendCommandExecuted && data === "OK") {
        parser.removeListener("data", onData);
        isSendingSMS = false;

        port.write(`AT+CMGDA="DEL SENT"\r\n`);

        setTimeout(() => {
          resolve("SMS SENT SUCCESSFULLY!");
        }, 500);
      } else if (data.includes("ERROR")) {
        parser.removeListener("data", onData);

        isSendingSMS = false;
        await resetGSM(port, parser, gsmConfig);

        reject(`ERROR WHEN TRY SEND SMS: ${data}`);
      }
    };

    parser.on("data", onData);

    setTimeout(() => {
      port.write(`AT+CMGS= "+258${phoneNumber}"\r\n`);
    }, 1000);
  });
}

async function gsmConfig() {
  try {
    await executeCommand("ATZ").then((res) => console.log(res));
    await executeCommand("AT+CMGF=1").then((res) => console.log(res));
    await executeCommand(`AT+CMGDA="DEL READ"`).then((res) => console.log(res));
    await executeCommand(`AT+CSCS="8859-1"`).then((res) => console.log(res));
  } catch (error) {
    await notifications("GSM_OFF");
  }
}

async function initializeGSM() {
  await resetGSM(port, parser, gsmConfig);
  await gsmConfig();
  await getUnreadMessages();
}

async function handleData(data: string) {
  if (!data.startsWith("AT")) console.log("GSM MESSAGE: ", data);
  if (data.startsWith("+CMTI:")) newSMS(data);
  else if (isExecutingCommand) onExecuteCommand(data);
}

/**
 * TIMERS
 */

const checkUnreadMessageInterval = setInterval(async () => {
  if (!isSendingSMS && !isExecutingCommand) {
    await executeCommand("AT").then((res) => console.log(res));
    await getUnreadMessages();
    sendSMSManager();
  }
}, 35000);

const restartTime = 15 * 60 * 1000;
const restartAllSystemTimer = setInterval(() => {
  console.log("Restart timer!");
  if (!isSendingSMS && !isExecutingCommand && !isExecutingAPIRequest) {
    console.log("Restart Sys!");
    process.exit(0);
  }
}, restartTime);
