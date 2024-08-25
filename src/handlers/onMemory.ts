import { SMSResponseType } from "../@types/app";
import AppQueue from "../libs/Queue";

export const handleOnMemoy = async (sms: SMSResponseType[]) => {
  // console.log("On memory SMS: ", sms);
  sms.forEach(async (m) => {
    await AppQueue.add("NewSMS", m);

    // await gsmModem.deleteSMS(m);
  });
};
