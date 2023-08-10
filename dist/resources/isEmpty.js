"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = exports.isObjectEmpty = exports.isArrayEmpty = exports.isNumberEmpty = exports.isStringEmpty = void 0;
const validStringRegex = /[\S\s]+[\S]+/;
function isStringEmpty(str) {
    return !validStringRegex.test(str);
}
exports.isStringEmpty = isStringEmpty;
function isNumberEmpty(num) {
    if (isNaN(num))
        return true;
    if (num != null)
        return false;
    return true;
}
exports.isNumberEmpty = isNumberEmpty;
function isArrayEmpty(arr) {
    if (Array.isArray(arr) && arr.length > 0)
        return false;
    return true;
}
exports.isArrayEmpty = isArrayEmpty;
function isObjectEmpty(obj) {
    if (typeof obj === "object" &&
        !Array.isArray(obj) &&
        obj !== null &&
        obj !== undefined &&
        Object.keys(obj).length > 0) {
        return false;
    }
    return true;
}
exports.isObjectEmpty = isObjectEmpty;
function isEmpty(value) {
    if (typeof value === "string" && isNaN(value))
        return isStringEmpty(value);
    if (!isNaN(value))
        return isNumberEmpty(value);
    if (Array.isArray(value))
        return isArrayEmpty(value);
    if (!Array.isArray(value))
        return isObjectEmpty(value);
    return true;
}
exports.isEmpty = isEmpty;
