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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetGSM = void 0;
const onoff_1 = require("onoff");
// Configuração do pino GPIO 23 como saída em nível alto (HIGH)
const resetPin = new onoff_1.Gpio(23, "high");
function resetGSM(port, parser, callBack) {
    console.log("Trying to restart GSM!");
    let tryCounter = 0;
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            // Coloca o pino em nível baixo (LOW) por um curto período de tempo
            resetPin.writeSync(0);
            yield sleep(100);
            // Volta o pino ao nível alto (HIGH)
            resetPin.writeSync(1);
            const interval = setInterval(() => {
                if (tryCounter > 5) {
                    clearInterval(interval);
                    parser.removeListener("data", onData);
                    throw new Error("Time to try connect to GSM expired!");
                }
                port.write("AT\r\n");
                tryCounter++;
            }, 10000);
            const onData = (data) => __awaiter(this, void 0, void 0, function* () {
                console.log("RESET EVENT LISTENER DATA: ", [data]);
                if (data.replace("\r", "") === "OK") {
                    clearInterval(interval);
                    parser.removeListener("data", onData);
                    callBack && (yield callBack());
                    console.log("GSM RESTARTED!");
                    resolve(true);
                }
            });
            parser.on("data", onData);
        }
        catch (error) {
            console.error("Error when try to restart GSM:", error);
            reject(false);
        }
    }));
}
exports.resetGSM = resetGSM;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
