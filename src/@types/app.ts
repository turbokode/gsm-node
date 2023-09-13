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
