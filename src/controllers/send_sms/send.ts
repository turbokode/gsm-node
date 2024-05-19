import { Request, Response } from "express";
import AppQueue from "../../libs/Queue";
import { isStringEmpty } from "../../resources/isEmpty";
import { isValidPhoneNumber } from "../../resources/isValidValue";

export async function send(req: Request, res: Response) {
  const { phoneNumber, message } = req.body;

  try {
    if (isStringEmpty(phoneNumber)) throw new Error("Phone number is empty!");

    if (isStringEmpty(message)) throw new Error("Message content is empty!");

    if (isValidPhoneNumber(phoneNumber)) throw new Error("Ivalid phoneNumber!");

    if (!req.gsmPort) throw new Error("GSM port not found!");

    //ADD to queue send sms
    console.log("Pedido de envio de sms:", { phoneNumber, message });

    await AppQueue.add("SendSMS", {
      message,
      sender: phoneNumber,
      gsmPort: req.gsmPort,
    });

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    /**
     * Geral log do erro e enviar uma notificação para o admin!
     */

    res.status(500).json({ message: err });
  }
}
