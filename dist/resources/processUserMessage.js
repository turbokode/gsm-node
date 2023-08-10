"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUserMessage = void 0;
function processUserMessage(userMessage) {
    const selectPhoneNumberRegex = /"\+258([0-9]+)"/;
    const dateRegex = /(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2})/;
    const math = userMessage[1].match(selectPhoneNumberRegex);
    const dateMath = userMessage[1].match(dateRegex);
    let messageProps = { content: "", phoneNumber: "" };
    if (math && dateMath && math[1] && dateMath[0]) {
        messageProps = {
            phoneNumber: math[1],
            content: userMessage[2],
            date: newDate(dateMath[0]),
        };
    }
    return messageProps;
}
exports.processUserMessage = processUserMessage;
function newDate(dateString) {
    const [datePart, timePart] = dateString.split(",");
    const [year, month, day] = datePart.split("/").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);
    const date = new Date(year + 2000, month - 1, day, hour, minute, second);
    return date;
}
