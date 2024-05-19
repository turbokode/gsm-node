import cors from "cors";
import "dotenv/config";
import express from "express";
import { SMSResponseType } from "./@types/app";
import newSMSQueue from "./libs/Queue";
import appRoutes from "./routes";
import { GSMModem } from "./services/serial-gsm";

const app = express();
const gsmModem = new GSMModem();

app.use(express.json());
app.use(cors());

appRoutes(app, gsmModem);

const handleNewSMS = async (sms: SMSResponseType) => {
  await newSMSQueue.add("NewSMS", sms);
};

gsmModem.OnNewSMS(handleNewSMS);
