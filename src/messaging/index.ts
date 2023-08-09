import { IMessagingConnectOptions, IMsgTopic } from "./@types";
import { kafka, producerConfig } from "./config";

export default class Messaging {
  private producer;

  constructor() {
    this.producer = kafka.producer(producerConfig);
  }

  public async connect({ module }: IMessagingConnectOptions): Promise<void> {
    if (module === "prod") {
      console.log("connecting to messaging producer");
      return this.producer
        .connect()
        .then(() => console.log("connected to messaging producer"));
    }
  }

  public async disconnect({ module }: IMessagingConnectOptions): Promise<void> {
    if (module === "prod") {
      console.log("disconnecting to messaging producer");
      return this.producer
        .disconnect()
        .then(() => console.log("disconnected to messaging producer"));
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
}
