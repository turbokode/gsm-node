import { AxiosError } from "axios";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { GSM_Response, SMS_ResponseType } from "./@types/app";
import { api } from "./api/server";
import { configGSM } from "./resources/configParams";

let serialportgsm = require("serialport-gsm");

let modem = serialportgsm.Modem();

const app = express();

const serverPort = process.env.PORT;

app.use(express.json());
app.use(cors());

app.post("/send_sms", async (req, res) => {
  const { phoneNumber, message } = req.body as {
    phoneNumber: string;
    message: string;
  };

  console.log("SEND SMS REQUEST: ", { phoneNumber, message });

  try {
    const toSendPhoneNumber = phoneNumber.startsWith("+258")
      ? phoneNumber
      : phoneNumber.startsWith("258")
      ? "+" + phoneNumber
      : "+258" + phoneNumber;

    modem.sendSMS(toSendPhoneNumber, message, false);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    res.status(500).json({ message: err });
  }
});

app.listen(serverPort, async () => {
  console.log(`🚀 The SMS server is running in ${serverPort} port!`);
});

modem.open(configGSM.serialCOM, configGSM.options, () => {
  console.log("GSM communication is Started!");
});

modem.on("open", (data: object) => {
  console.log("GSM communication is open: ", data);

  modem.initializeModem((dat: object) => {
    console.log("GSM initialize: ", dat);
  });

  modem.getSimInbox((data: GSM_Response<SMS_ResponseType>) => {
    console.log("Inbox SMS: ", data);

    data.data.forEach(async (smsData) => {
      await postRequest(smsData);
      modem.deleteMessage(smsData);
    });
  });
});

modem.on("onNewMessage", (data: SMS_ResponseType[]) => {
  console.log("New Message: ", data);

  data.forEach(async (smsData) => {
    await postRequest(smsData);
  });
});

async function postRequest(smsData: SMS_ResponseType) {
  try {
    const response = await api.post("/system_gate_way", {
      phoneNumber: "+" + smsData.sender,
      content: smsData.message,
    });

    console.log("POST TO SERVER EXECUTED: ", response.data);
  } catch (error) {
    const err = error as AxiosError;

    console.log("POST ERROR: ", err.message);
    const message = `Desculpa um error inesperado foi verificado no sistema, por favor volte a tentar mais tarde.\n\nAjuda: ${process.env.ALERT_PHONE_NUMBER}.`;

    modem.sendSMS(smsData.sender, message, false);
  }
}
