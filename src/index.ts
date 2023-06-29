import { ReadlineParser, SerialPort } from "serialport";
import { isStringEmpty } from "./resources/isEmpty";
import { processUserMessage } from "./resources/processUserMessage";
import { removeAccents } from "./resources/removeAccents";

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

    const sendStatus = await sendSMS(
      newUserMessage.phoneNumber,
      newUserMessage.content
    );

    console.log("Message Enviada: ", sendStatus);
    // const systemGateWay = new SystemGateway({
    //   content: newUserMessage.content,
    //   phoneNumber: newUserMessage.phoneNumber,
    // });

    // await systemGateWay.exec();
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

    // port.write(`AT+CMGDA="DEL SENT"\r\n`);
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
