export interface GSMResponseType {
  status: "success" | "fail";
  request: "sendSMS";
  data: {
    messageId: string;
    response: string;
    message?: string;
    recipient?: string;
  };
}
