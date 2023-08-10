"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHexMessage = void 0;
function isHexMessage(message) {
    // Verifica se a mensagem contém apenas caracteres hexadecimais
    const hexPattern = /^[0-9A-Fa-f]+$/;
    return hexPattern.test(message);
}
exports.isHexMessage = isHexMessage;
