import { Express } from "express";
import { sendSMSRoutes } from "./sendSMS";

export default function appRoutes(app: Express) {
  app.use("/send_sms", sendSMSRoutes);
}
