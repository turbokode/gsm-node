export type IMessagingTopic = "new.userSMS";

export type IMessagingConnectOptions = {
  module: "cons" | "prod";
};

export type IEachMessageCallback = (
  error: any | null,
  data: string | null
) => void;
