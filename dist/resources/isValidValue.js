"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPhoneNumber = exports.isValidEmail = void 0;
const isEmpty_1 = require("./isEmpty");
const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const vmPhoneNumberRegex = /^(\+258)?8[4-5][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/;
const mcelPhoneNumberRegex = /^(\+258)?8[2-3][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/;
const mvPhoneNumberRegex = /^(\+258)?8[6-7][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/;
const mzPhoneNumberRegex = /^(\+258)?8[2-7][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/;
/**
 *
 * @param value - Email to validate
 * @returns Returns true if a email is valid or false if not.
 */
function isValidEmail(value) {
    return emailRegex.test(value);
}
exports.isValidEmail = isValidEmail;
/**
 *
 * @param value - Phone number
 * @param provider - Service provider company
 * @returns Returns true if a number is valid or false if not.
 */
function isValidPhoneNumber(value, provider = "VODACOM") {
    if (!value || (0, isEmpty_1.isStringEmpty)(value))
        return false;
    switch (provider) {
        case "VODACOM":
            if (!vmPhoneNumberRegex.test(value))
                return false;
            break;
        case "MCEL":
            if (!mcelPhoneNumberRegex.test(value))
                return false;
            break;
        case "MOVITEL":
            if (!mvPhoneNumberRegex.test(value))
                return false;
            break;
        default:
            if (!mzPhoneNumberRegex.test(value))
                return false;
            break;
    }
    return true;
}
exports.isValidPhoneNumber = isValidPhoneNumber;
