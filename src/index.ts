import express from "express";
import { ReadlineParser, SerialPort } from "serialport";
import { api } from "./api/server";
import { isStringEmpty } from "./resources/isEmpty";
import { processUserMessage } from "./resources/processUserMessage";
import { removeAccents } from "./resources/removeAccents";

const app = express();
const serverPort = 3001;

app.use(express.json());

app.post("/send_sms", async (req, res) => {
  const { phoneNumber, message } = req.body;

  try {
    if (isStringEmpty(phoneNumber)) throw new Error("Phone number is empty!");
    if (isStringEmpty(message)) throw new Error("Message content is empty!");

    const sendStatus = await sendSMS(phoneNumber, message);

    if (!sendStatus) throw new Error("Failed when try to send SMS!");

    res.json({ message: "success" });
  } catch (err) {
    console.log(err);
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
let messageQueue = new Array<string>();
let isSendingSMS = false;

port.on("open", async () => {
  console.log("Serial port is open!");

  //Test serial communication
  await executeCommand("AT");
  await executeCommand("AT+CMGF=1");
  await executeCommand(`AT+CMGDA="DEL READ"`);
  await executeCommand(`AT+CSCS="8859-1"`);

  await getUnreadMessages();
});

async function getUnreadMessages(): Promise<string[]> {
  const unreadMessages = await new Promise<string[]>((resolve, reject) => {
    console.log("exec");
    let unreadMessages = new Array<string>();
    const selectUnreadMessageRegex = /\+CMGL: (\d+),"REC UNREAD"/;
    port.write('AT+CMGL="REC UNREAD"\r\n');

    const onData = (data: string) => {
      if (selectUnreadMessageRegex.test(data)) {
        unreadMessages.push(data);
      } else if (data === "OK") {
        resolve(unreadMessages);
        parser.removeListener("data", onData);
      }
    };

    parser.on("data", onData);
  });

  if (Array.isArray(unreadMessages)) {
    const queues = unreadMessages.map((message: string) => {
      const splited = message.split(",");
      return splited[0].replace("+CMGL: ", '+CMTI: "SM",');
    });
    messageQueue.push(...queues);
  }
  processNextMessage();
  return unreadMessages;
}

port.on("error", (err) => {
  if (err) console.log("Error on serial port: ", err.message);
});

function executeCommand(command: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let responses: string[] = [];

    port.write(`${command}\r\n`, (err) => {
      if (err) {
        reject(false);
        console.log(`Error when execute ${command}: ${err.message}`);
      }
    });

    let commandReceived = false;
    const onData = (data: string) => {
      responses.push(data);

      if (data.replace("\r", "") === command) commandReceived = true;

      if (commandReceived && data === "OK") {
        /**
         * Remove command form DB
         */
        console.log(`${command}: Success`);
        resolve(responses);
        parser.removeListener("data", onData);
      }
      if (commandReceived && data === "ERROR") {
        //Restart GSM
        console.log(`${command}: Error`);
        resolve([]);
        parser.removeListener("data", onData);
      }
    };

    parser.on("data", onData);
  });
}

parser.on("data", (data) => {
  console.log("GSM MESSAGE: ", data);
  if (data.startsWith("+CMTI:")) smsCommunicationManager(data);
});

function smsCommunicationManager(gsmMessage: string) {
  console.log("Nova mensagem recebida: ", gsmMessage);

  if (messageQueue.length > 0) messageQueue.push(gsmMessage);

  if (messageQueue.length == 0) {
    messageQueue.push(gsmMessage);
    processNextMessage();
  }
}

async function processNextMessage() {
  console.log("messageQueue.length", messageQueue.length);

  if (messageQueue.length === 0) {
    return;
  }

  if (isSendingSMS) return;

  const message = messageQueue.shift();

  if (!message) {
    console.error("NOT MESSAGE FOUND ON QUEUE");
    return;
  }

  const newUserMessage = await getNewUserMessage(message);

  if (!isStringEmpty(newUserMessage.phoneNumber)) {
    console.log("USER MESSAGE: ", newUserMessage);

    try {
      const response = await api.post("/system_gate_way", {
        phoneNumber: newUserMessage.phoneNumber,
        content: newUserMessage.content,
      });

      // if (isStringEmpty(response.data)) return;

      // const sendStatus = await sendSMS(
      //   response.data.phoneNumber,
      //   response.data.content
      // );

      console.log("Message Enviada: ", response.data);
    } catch (error) {
      console.log("POST ERROR: ", error);
      const message =
        "Desculpa um error inesperado foi verificado no sistema, por favor volte a tentar mais tarde.\n Caso o problema persista entre em contacto através do numero: +258824116651.\n\nEstamos a trabalhar arduamente para resolver o problema.";

      await sendSMS(newUserMessage.phoneNumber, message);
    }
  }

  await getUnreadMessages();
}

async function getNewUserMessage(line: string) {
  const index = line.split(",")[1].trim();

  const gsmResponse = await executeCommand(`AT+CMGR=${index}`);
  console.log("gsmResponse: ", gsmResponse);

  const userMessage = processUserMessage(gsmResponse);

  port.write(`AT+CMGDA="DEL READ"\r\n`);

  return userMessage;
}

async function sendSMS(
  phoneNumber: string,
  msg: string,
  callback?: () => void
) {
  isSendingSMS = true;

  return new Promise((resolve, reject) => {
    const message = removeAccents(msg);
    const endMessageIndicator = Buffer.from([26]);

    const sendIDRegex = /\+CMGS: (\d+)/;

    let sendExecuted = false;
    const onData = (data: string) => {
      console.log("SEND: ", data);
      if (sendIDRegex.test(data)) sendExecuted = true;

      if (sendExecuted && data.includes("OK")) {
        console.log("Mensagem enviada com sucesso!");
        parser.removeListener("data", onData);
        isSendingSMS = false;

        callback && callback();
        port.write(`AT+CMGDA="DEL SENT"\r\n`);
        resolve(true);
      } else if (data.includes("ERROR")) {
        console.error("Erro no envio da mensagem:", data);
        parser.removeListener("data", onData);
        isSendingSMS = false;

        reject(false);
      }
    };

    parser.on("data", onData);

    setTimeout(function () {
      // Comando AT para enviar a mensagem
      port.write(`AT+CMGS= "+258${phoneNumber}"\r\n`);
      port.write(`${message}`);

      setTimeout(() => {
        port.write(`${endMessageIndicator}\r\n`, (error) => {
          if (error) {
            reject(error);
            return;
          }
        });
      }, 200);
    }, 2000);
  });
}
