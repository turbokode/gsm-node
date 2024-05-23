import { SMSResponseType } from "../@types/app";
import AppQueue from "../libs/Queue";

export const handleNewSMS = async (sms: SMSResponseType[]) => {
  console.log("NEW SMS: ", sms);
  sms.forEach(async (m) => {
    await AppQueue.add("NewSMS", m);
  });
};
