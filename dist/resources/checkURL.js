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
let tryCounter = 0;
function checkGSM_URL() {
    return __awaiter(this, void 0, void 0, function* () {
        tryCounter++;
        process.env.GSM_PORT &&
            axios_1.default
                .post(process.env.GSM_PORT)
                .then((res) => {
                if (res.status !== 200) {
                    throw new Error("The GSM URL is not working good!");
                }
            })
                .catch((err) => __awaiter(this, void 0, void 0, function* () {
                if (tryCounter === 5) {
                    yield sleep(1000);
                    throw new Error(err);
                }
                yield checkGSM_URL();
            }));
    });
}
exports.checkGSM_URL = checkGSM_URL;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
