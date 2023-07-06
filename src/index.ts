import { AxiosError } from "axios";
import { isBefore } from "date-fns";
import express from "express";
import { ReadlineParser, SerialPort } from "serialport";
import { api } from "./api/server";
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

    const sendStatus = await sendSMS(phoneNumber, message);

    if (!sendStatus) throw new Error("Failed when try to send SMS!");

    res.json({ message: "success" });
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
let messageQueue = new Array<string>();
let isSendingSMS = false;
let isExecutingCommand = false;

setInterval(async () => {
  if (!isSendingSMS && isExecutingCommand) {
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
  const unreadMessages = await new Promise<string[]>((resolve, reject) => {
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
  });

  const queues = unreadMessages.map((message: string) => {
    const splited = message.split(",");
    return splited[0].replace("+CMGL: ", '+CMTI: "SM",');
  });
  messageQueue.push(...queues);

  processNextMessage();

  return unreadMessages;
}

port.on("error", (err) => {
  if (err) console.log("Error on serial port: ", err.message);
});

function executeCommand(command: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let responses: string[] = [];
    isExecutingCommand = true;

    port.write(`${command}\r\n`, async (err) => {
      if (err) {
        reject(false);
        await resetGSM(port, parser, gsmConfig);
        console.log(`Error when execute ${command}: ${err.message}`);
      }
    });

    let commandReceived = false;
    const onData = async (data: string) => {
      responses.push(data);

      if (data.replace("\r", "") === command) commandReceived = true;

      if (commandReceived && data === "OK") {
        /**
         * Remove command form DB
         */
        console.log(`${command}: Success`);
        parser.removeListener("data", onData);
        isExecutingCommand = false;

        resolve(responses);
      }
      if (commandReceived && data === "ERROR") {
        console.log(`${command}: Error`);
        parser.removeListener("data", onData);
        isExecutingCommand = false;

        await resetGSM(port, parser, gsmConfig);

        resolve([]);
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

  if (messageQueue.length === 0 || isSendingSMS) {
    return;
  }

  const message = messageQueue.shift();

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

    console.log(
      "isBefore(passedTime, new Date()): ",
      isBefore(new Date(), passedTime)
    );

    if (isBefore(new Date(), passedTime)) {
      const message =
        "Desculpa a sua solicitação esgotou o tempo de processamento, por favor volte a tentar novamente!";

      await sendSMS(newUserMessage.phoneNumber, message).catch((err) => {
        console.log("Error when try to send SMS!");
        /**
         * Geral log do erro e enviar uma notificação para o admin!
         */
      });
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

        await sendSMS(newUserMessage.phoneNumber, message);
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

    let sendCommandExecuted = false;
    const onData = async (data: string) => {
      console.log("SEND: ", data);
      if (sendIDRegex.test(data)) sendCommandExecuted = true;

      if (sendCommandExecuted && data.includes("OK")) {
        console.log("Mensagem enviada com sucesso!");
        parser.removeListener("data", onData);
        isSendingSMS = false;

        callback && callback();

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

async function gsmConfig() {
  console.log("CONFIG");
  await executeCommand("AT");
  await executeCommand("AT+CMGF=1");
  await executeCommand(`AT+CMGDA="DEL READ"`);
  await executeCommand(`AT+CSCS="8859-1"`);
}
