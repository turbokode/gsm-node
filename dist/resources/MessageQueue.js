"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueue = void 0;
const date_fns_1 = require("date-fns");
const expirationDate_1 = __importDefault(require("./expirationDate"));
class MessageQueue {
    constructor() {
        this.msgs = new Map();
        this.currentMsgKey = -1;
    }
    /**
     *
     * @param newMessage the message that will be inserted at the end of
     * the queue
     */
    set(_a) {
        var { date = new Date() } = _a, newMessage = __rest(_a, ["date"]);
        let isQueued = false;
        this.msgs.forEach((msg) => {
            if (msg.phoneNumber === newMessage.phoneNumber &&
                msg.message === newMessage.message) {
                const passed = (0, expirationDate_1.default)({ date: msg.date, minutes: 2 });
                isQueued = (0, date_fns_1.isBefore)(date, passed);
                console.log("Message with equal data! ", (0, date_fns_1.isBefore)(date, passed));
            }
        });
        !isQueued && this.msgs.set(this.msgs.size + 1, newMessage);
    }
    getAll() {
        return [...this.msgs.values()];
    }
    getNext() {
        this.msgs.forEach((msg, key) => {
            if (!msg.sendState)
                this.currentMsgKey = key;
        });
        // this.messages.find((msg) => !msg.sendState);
        return this.msgs.get(this.currentMsgKey);
    }
    /**
     *
     * @param message The oldMessage with updated message content or state
     * @returns Return the updated message if it exists in the queue, if it
     * does not exist, undefined is returned
     */
    update(message) {
        this.msgs.set(this.currentMsgKey, message);
        return message;
    }
    /**
     *
     * @param toDMsg the message to delete
     */
    delete(toDMsg) {
        this.msgs.forEach((msg, key) => {
            if (msg.phoneNumber === toDMsg.phoneNumber &&
                msg.message === toDMsg.message) {
                this.msgs.delete(key);
            }
        });
    }
}
exports.MessageQueue = MessageQueue;
