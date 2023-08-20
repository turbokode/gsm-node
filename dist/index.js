"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const date_fns_1 = require("date-fns");
const express_1 = __importDefault(require("express"));
const serialport_1 = require("serialport");
const server_1 = require("./api/server");
const MessageQueue_1 = require("./resources/MessageQueue");
const configServer_1 = require("./resources/configServer");
const expirationDate_1 = __importDefault(require("./resources/expirationDate"));
const isEmpty_1 = require("./resources/isEmpty");
const processUserMessage_1 = require("./resources/processUserMessage");
const removeAccents_1 = require("./resources/removeAccents");
const resetGSM_1 = require("./resources/resetGSM");
const app = (0, express_1.default)();
const serverPort = process.env.PORT;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.post("/send_sms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phoneNumber, message } = req.body;
    console.log("SEND SMS REQUEST: ", { phoneNumber, message });
    try {
        if ((0, isEmpty_1.isStringEmpty)(phoneNumber))
            throw new Error("Phone number is empty!");
        if ((0, isEmpty_1.isStringEmpty)(message))
            throw new Error("Message content is empty!");
        addToSendQueue(phoneNumber, message);
        res.json({ message: "success" });
    }
    catch (err) {
        console.log("Error when try to send SMS: ", err);
        /**
         * Geral log do erro e enviar uma notificação para o admin!
         */
        res.status(500).json({ message: err });
    }
}));
app.get("/check_sys", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let status = { server: true, gsm: false };
    try {
        yield executeCommand("AT");
        if (responses.includes("AT\r") && responses.includes("OK"))
            status.gsm = true;
        res.json({ message: "success", data: status });
    }
    catch (err) {
        console.log(err);
        /**
         * Gerar log do erro e enviar uma notificação para o admin!
         */
        res.status(500).json({ message: err });
    }
}));
app.listen(serverPort, () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, configServer_1.configServer)().catch((err) => {
        if (process.env.ALERT_PHONE_NUMBER &&
            !(0, isEmpty_1.isEmpty)(process.env.ALERT_PHONE_NUMBER))
            addToSendQueue(process.env.ALERT_PHONE_NUMBER, err);
    });
    console.log(`🚀 The SMS server is running in ${serverPort} port!`);
}));
// Create a port
const port = new serialport_1.SerialPort({ path: "/dev/serial0", baudRate: 115200 });
const parser = port.pipe(new serialport_1.ReadlineParser({ delimiter: "\r\n" }));
/* ============== USER COMMUNICATION SYSTEM ============== */
let lastSentMessage = undefined;
let newMessageQueue = new Array();
const sendSMSQueue = new MessageQueue_1.MessageQueue();
let commandExecutionsCounter = 0;
let isExecutingCommand = false;
let responses = [];
let tryToSendSMSCounter = 0;
let commandReceived = false;
let executingCommand = "";
let isSendingSMS = false;
port.on("open", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Serial port is open!");
    yield gsmConfig();
    yield getUnreadMessages();
}));
port.on("error", (err) => {
    if (err)
        console.log("Error on serial port: ", err.message);
});
parser.on("data", (data) => {
    console.log("GSM MESSAGE: ", data);
    if (isExecutingCommand)
        onExecuteCommand(data);
    if (data.startsWith("+CMTI:"))
        newSMS(data);
});
function onExecuteCommand(data) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log("EXECUTE LISTENER: ", data);
        if (data.replace("\r", "") === executingCommand)
            commandReceived = true;
        if (commandReceived)
            responses.push(data);
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
            yield (0, resetGSM_1.resetGSM)(port, parser, gsmConfig);
            isExecutingCommand = false;
        }
    });
}
function executeCommand(command) {
    console.log("EXECUTING: ", command);
    commandExecutionsCounter++;
    isExecutingCommand = true;
    executingCommand = command;
    responses = [];
    return new Promise((resolve, reject) => {
        let isExecuted = false;
        const interval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            const isCurrentCommand = !!responses.find((res) => res.replace("\r", "") === command);
            const okRes = !!responses.find((res) => res === "OK");
            if (okRes && isCurrentCommand)
                isExecuted = true;
            if (isExecuted) {
                commandExecutionsCounter = 0;
                clearTimeout(timeOut);
                clearInterval(interval);
                resolve(`${command} COMMAND EXECUTED!`);
            }
        }), 500);
        const timeOut = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            clearTimeout(timeOut);
            clearInterval(interval);
            yield (0, resetGSM_1.resetGSM)(port, parser, gsmConfig);
            yield executeCommand(command)
                .catch((err) => reject(err))
                .then((res) => resolve(res));
            if (commandExecutionsCounter >= 3) {
                commandExecutionsCounter = 0;
                reject("The GSM module is not responding!");
            }
        }), 65000);
        port.write(`${command}\r\n`, (err) => __awaiter(this, void 0, void 0, function* () {
            if (err) {
                clearTimeout(timeOut);
                clearInterval(interval);
                yield (0, resetGSM_1.resetGSM)(port, parser, gsmConfig);
                yield executeCommand(command)
                    .catch((err) => reject(err))
                    .then((res) => resolve(res));
                if (commandExecutionsCounter >= 5) {
                    commandExecutionsCounter = 0;
                    reject(`Error when execute ${command}: ${err.message}`);
                }
            }
        }));
    });
}
const checkUnreadMessageInterval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    if (!isSendingSMS && !isExecutingCommand) {
        yield getUnreadMessages();
    }
}), 35000);
function getUnreadMessages() {
    return __awaiter(this, void 0, void 0, function* () {
        const returnedUnreadMessages = yield new Promise((resolve, reject) => {
            let unreadMessages = new Array();
            let commandReceived = false;
            const selectUnreadMessageRegex = /\+CMGL: (\d+),"REC UNREAD"/;
            port.write('AT+CMGL="REC UNREAD"\r\n', (err) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    reject([]);
                    yield (0, resetGSM_1.resetGSM)(port, parser, gsmConfig);
                }
            }));
            const onData = (data) => {
                if (data.replace("\r", "") === 'AT+CMGL="REC UNREAD"')
                    commandReceived = true;
                if (selectUnreadMessageRegex.test(data)) {
                    unreadMessages.push(data);
                }
                else if (data === "OK" && commandReceived) {
                    parser.removeListener("data", onData);
                    resolve(unreadMessages);
                }
            };
            parser.on("data", onData);
        });
        const queues = returnedUnreadMessages.map((message) => {
            const splitted = message.split(",");
            return splitted[0].replace("+CMGL: ", '+CMTI: "SM",');
        });
        newMessageQueue.push(...queues);
        processNextMessage();
        return returnedUnreadMessages;
    });
}
function newSMS(gsmMessage) {
    console.log("NEW SMS: ", gsmMessage);
    tryToSendSMSCounter = 0;
    if (newMessageQueue.length > 0)
        newMessageQueue.push(gsmMessage);
    if (newMessageQueue.length === 0) {
        newMessageQueue.push(gsmMessage);
        processNextMessage();
    }
}
function processNextMessage() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("newMessageQueue.length", newMessageQueue.length);
        if (newMessageQueue.length === 0 || isSendingSMS) {
            return;
        }
        const message = newMessageQueue.shift();
        if (!message) {
            console.error("NOT MESSAGE FOUND ON QUEUE");
            return;
        }
        const newUserMessage = yield getNewUserMessage(message);
        if (newUserMessage && !(0, isEmpty_1.isStringEmpty)(newUserMessage.phoneNumber)) {
            console.log("USER MESSAGE: ", newUserMessage);
            const passedTime = (0, expirationDate_1.default)({
                date: newUserMessage.date,
                minutes: 15,
            });
            if ((0, date_fns_1.isAfter)(new Date(), passedTime)) {
                const message = "Desculpa a sua solicitação esgotou o tempo de processamento, por favor volte a tentar novamente!";
                addToSendQueue(newUserMessage.phoneNumber, message);
            }
            else {
                try {
                    const response = yield server_1.api.post("/system_gate_way", {
                        phoneNumber: newUserMessage.phoneNumber,
                        content: newUserMessage.content,
                    });
                    console.log("POST TO SERVER EXECUTED: ", response.data);
                }
                catch (error) {
                    const err = error;
                    console.log("POST ERROR: ", err.message);
                    const message = "Desculpa um error inesperado foi verificado no sistema, por favor volte a tentar mais tarde.\n Caso o problema persista entre em contacto através do numero: +258824116651.\n\nEstamos a trabalhar arduamente para resolver o problema.";
                    addToSendQueue(newUserMessage.phoneNumber, message);
                }
            }
        }
        yield getUnreadMessages();
    });
}
function getNewUserMessage(line) {
    return __awaiter(this, void 0, void 0, function* () {
        const index = line.split(",")[1].trim();
        try {
            yield executeCommand(`AT+CMGR=${index}`);
            const userMessage = (0, processUserMessage_1.processUserMessage)(responses);
            yield executeCommand(`AT+CMGD=${index}`);
            return userMessage;
        }
        catch (error) {
            console.log(error);
        }
    });
}
function addToSendQueue(phoneNumber, message) {
    console.log("ADD TO QUEUE: ", { phoneNumber, message });
    sendSMSQueue.set({ phoneNumber, message, sendState: false });
    if (isSendingSMS)
        return;
    sendSMSManager();
}
function sendSMSManager() {
    return __awaiter(this, void 0, void 0, function* () {
        const toSendMessage = sendSMSQueue.getNext();
        console.log("QUEUED MESSAGES: ", sendSMSQueue.getAll());
        console.log("toSendMessage: ", toSendMessage);
        if (toSendMessage && !toSendMessage.sendState) {
            if (lastSentMessage === toSendMessage)
                tryToSendSMSCounter++;
            lastSentMessage = toSendMessage;
            try {
                yield sendSMS(toSendMessage.phoneNumber, toSendMessage.message).then((res) => console.log(res));
                sendSMSQueue.update(Object.assign(Object.assign({}, toSendMessage), { sendState: true }));
            }
            catch (error) {
                console.log(`Failed when try to send SMS to ${toSendMessage.phoneNumber}: `, error);
                /**
                 * Save log
                 */
            }
            if (tryToSendSMSCounter < 2) {
                sendSMSManager();
            }
        }
    });
}
function sendSMS(phoneNumber, msg) {
    isSendingSMS = true;
    checkUnreadMessageInterval.refresh();
    //============= DEBUG MODE ==================
    // return new Promise((resolve) => {
    //   isSendingSMS = false;
    //   resolve("SMS SENT SUCCESSFULLY!");
    // });
    return new Promise((resolve, reject) => {
        const sendIDRegex = /\+CMGS: (\d+)/;
        const message = (0, removeAccents_1.removeAccents)(msg);
        const endMessageIndicator = Buffer.from([26]);
        let sendCommandExecuted = false;
        const onData = (data) => __awaiter(this, void 0, void 0, function* () {
            console.log("SEND: ", data);
            if (sendIDRegex.test(data))
                sendCommandExecuted = true;
            if (sendCommandExecuted && data === "OK") {
                parser.removeListener("data", onData);
                isSendingSMS = false;
                port.write(`AT+CMGDA="DEL SENT"\r\n`);
                setTimeout(() => {
                    resolve("SMS SENT SUCCESSFULLY!");
                }, 500);
            }
            else if (data.includes("ERROR")) {
                parser.removeListener("data", onData);
                yield (0, resetGSM_1.resetGSM)(port, parser, gsmConfig);
                isSendingSMS = false;
                reject(`ERROR WHEN TRY SEND SMS: ${data}`);
            }
        });
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
function gsmConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield executeCommand("AT").then((res) => console.log(res));
            yield executeCommand("AT+CMGF=1").then((res) => console.log(res));
            yield executeCommand(`AT+CMGDA="DEL READ"`).then((res) => console.log(res));
            yield executeCommand(`AT+CSCS="8859-1"`).then((res) => console.log(res));
        }
        catch (error) {
            console.log(error);
        }
    });
}
