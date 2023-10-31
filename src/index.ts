import { AxiosError } from "axios";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { GSM_Response, SMS_ResponseType } from "./@types/app";
import { api } from "./api/server";
import { configGSM } from "./resources/configParams";

let serialportgsm = require("serialport-gsm");

let modem = serialportgsm.Modem();

const receivedSMS = new Map<string, SMS_ResponseType>();

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

modem.on("open", () => {
  console.log(`Modem Sucessfully Opened`);

  // now we initialize the GSM Modem
  modem.initializeModem((msg: object, err: object) => {
    if (err) {
      console.log(`Error Initializing Modem - ${err}`);
    } else {
      console.log(`InitModemResponse: ${JSON.stringify(msg)}`);

      console.log(`Configuring Modem for Mode: "PDU"`);
      // set mode to PDU mode to handle SMS
      modem.setModemMode((msg: object, err: object) => {
        if (err) {
          console.log(`Error Setting Modem Mode - ${err}`);
        } else {
          console.log(`Set Mode: ${JSON.stringify(msg)}`);

          // get the Network signal strength
          modem.getNetworkSignal((result: object, err: object) => {
            if (err) {
              console.log(`Error retrieving Signal Strength - ${err}`);
            } else {
              console.log(`Signal Strength: ${result}`);
            }
          });

          // get Modem Serial Number
          modem.getModemSerial((result: object, err: object) => {
            if (err) {
              console.log(`Error retrieving ModemSerial - ${err}`);
            } else {
              console.log(`Modem Serial: ${result}`);
            }
          });

          // get the Own Number of the Modem
          modem.getOwnNumber((result: object, err: object) => {
            if (err) {
              console.log(`Error retrieving own Number - ${err}`);
            } else {
              console.log(`Own number: ${result}`);
            }
          });
        }
      }, "PDU");

      // get info about stored Messages on SIM card
      modem.checkSimMemory((result: object, err: object) => {
        if (err) {
          console.log(`Failed to get SimMemory ${err}`);
        } else {
          console.log(`Sim Memory Result: ${JSON.stringify(result)}`);

          // read the whole SIM card inbox
          modem.getSimInbox(
            (result: GSM_Response<SMS_ResponseType>, err: object) => {
              if (err) {
                console.log(`Failed to get SimInbox ${err}`);
              } else {
                console.log(`Sim Inbox Result: ${JSON.stringify(result)}`);

                result &&
                  result.data.forEach(async (smsData) => {
                    await postRequest(smsData);
                    modem.deleteMessage(smsData);
                  });
              }
            }
          );
        }
      });
    }
  });

  modem.on("onNewMessageIndicator", (data: object) => {
    //indicator for new message only (sender, timeSent)
    console.log(`Event New Message Indication: ` + JSON.stringify(data));
  });

  modem.on("onNewMessage", (data: SMS_ResponseType[]) => {
    console.log("New Message: ", data);

    data.forEach(async (smsData) => {
      await postRequest(smsData);
    });
  });

  modem.on("onSendingMessage", (data: object) => {
    //whole message data
    console.log(`Event Sending Message: ` + JSON.stringify(data));
  });

  modem.on("onMemoryFull", (data: object) => {
    //whole message data
    console.log(`Event Memory Full: ` + JSON.stringify(data));
  });

  modem.on("close", (data: object) => {
    //whole message data
    console.log(`Event Close: ` + JSON.stringify(data));
  });
});

modem.open(configGSM.serialCOM, configGSM.options, () => {
  console.log("GSM communication is Started!");
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
