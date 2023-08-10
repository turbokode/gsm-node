"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
function expirationDate({ date, years = 0, months = 0, weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0, }) {
    const expDate = (0, date_fns_1.add)(date, {
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
    });
    return expDate;
}
exports.default = expirationDate;
