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
const config_1 = require("./config");
class Messaging {
    constructor() {
        this.producer = config_1.kafka.producer(config_1.producerConfig);
    }
    connect({ module }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (module === "prod") {
                console.log("connecting to messaging producer");
                return this.producer
                    .connect()
                    .then(() => console.log("connected to messaging producer"));
            }
        });
    }
    disconnect({ module }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (module === "prod") {
                console.log("disconnecting to messaging producer");
                return this.producer
                    .disconnect()
                    .then(() => console.log("disconnected to messaging producer"));
            }
        });
    }
    create(topic, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const key = `key_${topic}`;
                const messages = [{ value: message, key }];
                yield this.connect({ module: "prod" });
                console.log(`[new message on topic]: '${topic}'`);
                console.log(`[message]: ${message}`);
                yield this.producer.send({ topic, messages });
                console.log("message sent!");
            }
            catch (error) {
                console.log(`[error_topic]: '${topic}' failed to produce message:`);
                console.error(error);
            }
            finally {
                yield this.disconnect({ module: "prod" });
            }
        });
    }
}
exports.default = Messaging;
