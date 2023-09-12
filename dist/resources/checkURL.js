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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGSM_URL = void 0;
const axios_1 = __importDefault(require("axios"));
function checkGSM_URL() {
    return __awaiter(this, void 0, void 0, function* () {
        process.env.GSM_PORT &&
            axios_1.default
                .post(process.env.GSM_PORT)
                .catch((err) => {
                throw new Error(err);
            })
                .then((res) => {
                if (res.status !== 200) {
                    throw new Error("The GSM URL is not working good!");
                }
            });
    });
}
exports.checkGSM_URL = checkGSM_URL;
