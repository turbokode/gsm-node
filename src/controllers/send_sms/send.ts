import { Request, Response } from "express";
import { gsmModem } from "../..";
import { GSM_Response, ISendSMSData } from "../../@types/app";
import { isStringEmpty } from "../../resources/isEmpty";
import { isValidPhoneNumber } from "../../resources/isValidValue";

export async function send(req: Request, res: Response) {
  const { phoneNumber, message } = req.body;

  try {
    if (isStringEmpty(phoneNumber)) throw new Error("Phone number is empty!");

    if (isStringEmpty(message)) throw new Error("Message content is empty!");

    if (!isValidPhoneNumber(phoneNumber))
      throw new Error("Ivalid phoneNumber!");

    if (!gsmModem.isReady) throw new Error("GSM modem is not ready!");

    await gsmModem.senSMS(phoneNumber, message, callBack);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    /**
     * Geral log do erro e enviar uma notificação para o admin!
     */

    res.status(500).json({ message: err });
  }
}

const callBack = (data: GSM_Response<ISendSMSData>) => {
  console.log("Send sms callBack: ", data);
};
