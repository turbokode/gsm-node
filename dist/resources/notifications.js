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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
const server_1 = require("../api/server");
function notifications(type, addToSendQueue, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (type === "NET_OFF") {
                const notificationMessage = "SWITCH MASTER ERROR:\n\n O sistema de SMS não conseguiu se conectar ao servidor central!";
                if (addToSendQueue && process.env.ALERT_PHONE_NUMBER)
                    addToSendQueue(process.env.ALERT_PHONE_NUMBER, notificationMessage);
            }
            else {
                switch (type) {
                    case "BAD_REQUEST":
                        const errMessage1 = "Error in trying to execute a central server request, this error may have happened because of a system problem or internet connection. Please try again later if the error persists contact maintenance.";
                        yield server_1.api.post("/notifications/", {
                            type: "err",
                            description: errMessage1,
                        });
                        break;
                    case "SMS_LOS":
                        const errMessage = "Error when trying to send a message, the SIM CARD may be out of balance, please recharge the card, if the problem persist, notify maintenance.";
                        yield server_1.api.post("/notifications/", {
                            type: "err",
                            description: errMessage,
                        });
                        break;
                    case "GSM_OFF":
                        const errMessage2 = "Error communicating with the sms sending module, manually restart the system, if the problem persists, please contact maintenance.";
                        yield server_1.api.post("/notifications/", {
                            type: "err",
                            description: errMessage2,
                        });
                        break;
                    default:
                        const errMessage3 = "Unexpected error in sms system, manually restart the system, if the problem persists, please contact maintenance.";
                        yield server_1.api.post("/notifications/", {
                            type: "err",
                            description: errMessage3,
                        });
                        break;
                }
            }
        }
        catch (error) {
            console.log(error);
        }
    });
}
exports.notifications = notifications;
