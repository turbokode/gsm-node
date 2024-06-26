export type MessageType = {
  phoneNumber: string;
  message: string;
  sendState?: boolean;
  date?: Date;
};

export type NotificationContentType = { code?: string; message: string };
export type SystemNotificationType =
  | "NET_OFF"
  | "SMS_LOS"
  | "GSM_OFF"
  | "BAD_REQUEST";

export type NotificationType = {
  type: SystemNotificationType;
  index: number;
  date: Date;
};

export interface GSM_Response<T> {
  status: string;
  request: string;
  data: T[];
}

export interface INewSMSQueue {
  indicator: string;
  isExecuted: Boolean;
}

//NEW VERTION
export type IJobs = "NewSMS" | "SendSMS";

export type GSMPortType = Object;

export interface SMSResponseType {
  sender: string;
  message: string;
  index?: number;
  readStatus?: boolean;
  msgStatus?: number;
  dateTimeSent?: string;
  header?: SMSHeader;
}

export interface SMSHeader {
  encoding: string;
  smsc: string;
  smscType: string;
  smscPlan: string;
}

export interface ISendSMSData {
  messageId: string;
  message: string;
  recipient: string;
  response: "Message Successfully Sent" | "Successfully Sent to Message Queue";
}
