import cors from "cors";
import "dotenv/config";
import express from "express";
import { SMSResponseType } from "./@types/app";
import AppQueue from "./libs/Queue";
import appRoutes from "./routes";
import { GSMModem } from "./services/serial-gsm";

const port = process.env.PORT;

const app = express();
export const gsmModem = new GSMModem();

app.use(express.json());
app.use(cors());

appRoutes(app);

const handleNewSMS = async (sms: SMSResponseType[]) => {
  // console.log("NEW SMS: ", sms);
  await AppQueue.add("NewSMS", sms[0]);
};

gsmModem.OnMemoriSMS(handleNewSMS);

gsmModem.checkIsReady().finally(() => {
  app.listen(port, async () => {
    console.log(`🚀 The SMS server is running in ${port} port!`);
  });
});
