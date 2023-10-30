import { AxiosError } from "axios";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { GSM_Response, SMS_ResponseType } from "./@types/app";
import { api } from "./api/server";
import { configGSM } from "./resources/configParams";

let serialportgsm = require("serialport-gsm");

let modem = serialportgsm.Modem();
/*
const app = express();

const serverPort = process.env.PORT;

app.use(express.json());
app.use(cors());

app.post("/send_sms", async (req, res) => {
  const { phoneNumber, message } = req.body;

  console.log("SEND SMS REQUEST: ", { phoneNumber, message });

  try {
    modem.sendSMS("+258" + phoneNumber, message, false);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    res.status(500).json({ message: err });
  }
});

app.listen(serverPort, async () => {
  console.log(`🚀 The SMS server is running in ${serverPort} port!`);
});
*/

modem.open(configGSM.serialCOM, configGSM.options, () => {
  console.log("GSM communication is Open!");
});

modem.on('open', (data : object) => {
    modem.initializeModem((dat : object) =>{console.log(data)})
    modem.getSimInbox((data : object)=>{console.log("SMS: ",JSON.stringify(data))})
})

//modem.on('onNewMessage', (data:object)=>{console.log("New Message: ", JSON.stringify(data))})

modem.deleteAllSimMessages((dataLocal: object)=>{
console.log("DELETE: ",dataLocal);
});

modem.on("onNewMessage", (data: GSM_Response<SMS_ResponseType>) => {
  console.log("New Message: ", data);

/*  data.data.forEach(async (smsData) => {
    try {
      const response = await api.post("/system_gate_way", {
        phoneNumber: smsData.sender,
        content: smsData.message,
      });

      console.log("POST TO SERVER EXECUTED: ", response.data);
    } catch (error) {
      const err = error as AxiosError;

      console.log("POST ERROR: ", err.message);
      const message = `Desculpa um error inesperado foi verificado no sistema, por favor volte a tentar mais tarde.\n\nAjuda: ${process.env.ALERT_PHONE_NUMBER}.`;

      modem.sendSMS(smsData.sender, message, false);
    }
  });*/
});
