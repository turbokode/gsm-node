import Queue from "bull";
import { GSMPortType, IJobs, SMSResponseType } from "../@types/app";
import redisConfig from "../config/redis";
import * as jobs from "../jobs";

const host = redisConfig.host;
const port = redisConfig.port;

interface IProps extends SMSResponseType {
  gsmPort?: GSMPortType;
}

const queues = Object.values(jobs).map((job) => ({
  bull: new Queue(job.key, `redis://${host}:${port}`),
  name: job.key,
  handle: job.handle,
}));

const AppQueue = {
  queues,
  add(name: IJobs, data: IProps) {
    // console.log({ name, ...data });
    const queue = this.queues.find((q) => q.name === name);

    return queue?.bull.add(data);
  },
  process() {
    return this.queues.forEach((q) => {
      q.bull.process(q.handle);

      q.bull.on("failed", (job, err) => {
        console.error(job, err);
      });
    });
  },
};

export default AppQueue;
