export type IMsgTopic = "new.userSMS" | "new.apiSMS";

export type IMessagingConnectOptions = {
  module: "cons" | "prod";
};

export type IEachMsgCallback = (err: any | null, data: string) => void;
