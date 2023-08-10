"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToString = void 0;
function hexToString(hex) {
    const buffer = Buffer.from(hex, "hex");
    return buffer.toString("utf8");
}
exports.hexToString = hexToString;
