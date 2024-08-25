import { Request, Response } from "express";
import { z } from "zod";
import { gsmModem } from "../..";
import { GSM_Response, ISendSMSData } from "../../@types/app";
import { isValidPhoneNumber } from "../../resources/isValidValue";

const sendSMSSchema = z.object({
  phoneNumber: z.string().refine(isValidPhoneNumber, {
    message: "Invalid phone number!",
  }),
  message: z.string().min(1, "Message content is empty!"),
});

export async function send(req: Request, res: Response) {
  try {
    const { phoneNumber, message } = sendSMSSchema.parse(req.body);

    if (!gsmModem.isReady) {
      throw new Error("GSM modem is not ready!");
    }

    await gsmModem.sendSMS(phoneNumber, message, callBack);

    return res.json({ message: "SMS sent successfully!" });
  } catch (err) {
    console.error("Error when trying to send SMS:", err);

    return res.status(500).json({ message: err instanceof Error ? err.message : "An unexpected error occurred" });
  }
}

const callBack = (data: GSM_Response<ISendSMSData>) => {
  console.log("Send SMS callback:", data);
};
