import {
  ConsumerConfig,
  Kafka,
  KafkaConfig,
  ProducerConfig,
  SASLOptions,
} from "kafkajs";
import dotenv from "dotenv";

dotenv.config();
const kafkaHost = process.env.KAFKA_HOST;
const mechanism = process.env.KAFKA_MECHANISM;
const username = process.env.KAFKA_USERNAME;
const password = process.env.KAFKA_PASSWORD;
const groupId = process.env.KAFKA_GROUP_ID!;

export const config: KafkaConfig = {
  clientId: "gsm-server",
  logLevel: 1,
  brokers: [kafkaHost!],
  ssl: true,
  connectionTimeout: 10000,
  retry: { maxRetryTime: 10000 },
  sasl: { mechanism, username, password } as SASLOptions,
};

export const consumerConfig: ConsumerConfig = {
  groupId,
  maxWaitTimeInMs: 10000,
  allowAutoTopicCreation: true,
  retry: { maxRetryTime: 10000 },
};

export const producerConfig: ProducerConfig = {
  allowAutoTopicCreation: true,
  retry: { maxRetryTime: 10000 },
};

export const kafka = new Kafka(config);
