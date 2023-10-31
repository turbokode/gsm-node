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

export interface SMS_ResponseType {
  sender: string;
  message: string;
  index: number;
  readStatus: boolean;
  msgStatus: number;
  dateTimeSent: string;
  header: SMSHeader;
}

export interface SMSHeader {
  encoding: string;
  smsc: string;
  smscType: string;
  smscPlan: string;
}
