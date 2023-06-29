import { hexToString } from "./hexToString";
import { isHexMessage } from "./isHexMessage";

export function prepareReceivedSMS(msg: string) {
  let message = msg;
  if (isHexMessage(msg)) message = hexToString(msg);

  return message;
}
