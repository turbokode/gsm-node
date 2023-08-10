"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAccents = void 0;
function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
exports.removeAccents = removeAccents;
