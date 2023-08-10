"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareReceivedSMS = void 0;
const hexToString_1 = require("./hexToString");
const isHexMessage_1 = require("./isHexMessage");
function prepareReceivedSMS(msg) {
    let message = msg;
    if ((0, isHexMessage_1.isHexMessage)(msg))
        message = (0, hexToString_1.hexToString)(msg);
    return message;
}
exports.prepareReceivedSMS = prepareReceivedSMS;
