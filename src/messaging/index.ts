import {
  IEachMsgCallback,
  IMessagingConnectOptions,
  IMsgTopic,
} from "./@types";
import { consumerConfig, kafka, producerConfig } from "./config";

export default class Messaging {
  private producer;
  private consumer;

  constructor() {
    this.producer = kafka.producer(producerConfig);
    this.consumer = kafka.consumer(consumerConfig);
  }

  public async connect({ module }: IMessagingConnectOptions): Promise<void> {
    if (module === "prod") {
      console.log("connecting to messaging producer");
      return this.producer
        .connect()
        .then(() => console.log("connected to messaging producer"));
    }

    if (module === "cons") {
      console.log("connecting to messaging consumer");
      return this.consumer
        .connect()
        .then(() => console.log("connected to messaging consumer"));
    }
  }

  public async disconnect({ module }: IMessagingConnectOptions): Promise<void> {
    if (module === "prod") {
      console.log("disconnecting to messaging producer");
      return this.producer
        .disconnect()
        .then(() => console.log("disconnected to messaging producer"));
    }

    if (module === "cons") {
      console.log("disconnecting to messaging consumer");
      return this.consumer
        .disconnect()
        .then(() => console.log("disconnected to messaging consumer"));
    }
  }

  public async create(topic: IMsgTopic, message: string): Promise<void> {
    try {
      const key = `key_${topic}`;
      const messages = [{ value: message, key }];

      await this.connect({ module: "prod" });

      console.log(`[new message on topic]: '${topic}'`);
      console.log(`[message]: ${message}`);

      await this.producer.send({ topic, messages });
      console.log("message sent!");
    } catch (error) {
      console.log(`[error_topic]: '${topic}' failed to produce message:`);
      console.error(error);
    } finally {
      await this.disconnect({ module: "prod" });
    }
  }

  public async get(
    topic: IMsgTopic,
    callback: IEachMsgCallback
  ): Promise<void> {
    await this.connect({ module: "cons" });
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message, ...payload }) => {
        if (topic === payload.topic) {
          const data = message.value!.toString();

          console.log(`[new message on topic]: '${topic}'`);
          console.log(`[message]: ${data}`);

          callback(null, data);
        }
      },
    });
  }
}
