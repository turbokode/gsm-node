"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafka = exports.producerConfig = exports.consumerConfig = exports.config = void 0;
const kafkajs_1 = require("kafkajs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const kafkaHost = process.env.KAFKA_HOST;
const mechanism = process.env.KAFKA_MECHANISM;
const username = process.env.KAFKA_USERNAME;
const password = process.env.KAFKA_PASSWORD;
const groupId = process.env.KAFKA_GROUP_ID;
exports.config = {
    clientId: "gsm-server",
    logLevel: 1,
    brokers: [kafkaHost],
    ssl: true,
    connectionTimeout: 10000,
    retry: { maxRetryTime: 10000 },
    sasl: { mechanism, username, password },
};
exports.consumerConfig = {
    groupId,
    maxWaitTimeInMs: 10000,
    allowAutoTopicCreation: true,
    retry: { maxRetryTime: 10000 },
};
exports.producerConfig = {
    allowAutoTopicCreation: true,
    retry: { maxRetryTime: 10000 },
};
exports.kafka = new kafkajs_1.Kafka(exports.config);
