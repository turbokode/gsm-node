import cors from "cors";
import "dotenv/config";
import express from "express";
import { SMSResponseType } from "./@types/app";
import AppQueue from "./libs/Queue";
import { GsmPort } from "./middlewares/GsmPort";
import appRoutes from "./routes";
import { GSMModem } from "./services/serial-gsm";

const app = express();
const gsmModem = new GSMModem();

app.use(express.json());
app.use(cors());

const gsmMiddleware = new GsmPort(gsmModem);

//Add gsm port to the request object
app.use(gsmMiddleware.handle);

appRoutes(app);

const handleNewSMS = async (sms: SMSResponseType) => {
  await AppQueue.add("NewSMS", sms);
};

gsmModem.OnNewSMS(handleNewSMS);
