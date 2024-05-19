import Queue from "bull";
import { IJobs, SMSResponseType } from "../@types/app";
import redisConfig from "../config/redis";
import * as jobs from "../jobs";

const host = redisConfig.host;
const port = redisConfig.port;

const queues = Object.values(jobs).map((job) => ({
  bull: new Queue(job.key, `redis://${host}:${port}`),
  name: job.key,
  handle: job.handle,
}));

export default {
  queues,
  add(name: IJobs, data: SMSResponseType) {
    const queue = this.queues.find((q) => q.name === name);

    return queue?.bull.add(data);
  },
  process() {
    return this.queues.forEach((q) => {
      q.bull.process(q.handle);

      q.bull.on("failed", (job, err) => {});
    });
  },
};
