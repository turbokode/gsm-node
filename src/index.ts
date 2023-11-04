import { AxiosError } from "axios";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { SMS_ResponseType } from "./@types/app";
import { api } from "./api/server";
import { configGSM } from "./resources/configParams";
import { SerialPortGSM } from "./serialport-gsm/lib";

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

    gsmModem.sendSMS(toSendPhoneNumber, message, false);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error when try to send SMS: ", err);
    res.status(500).json({ message: err });
  }
});

app.listen(serverPort, async () => {
  console.log(`🚀 The SMS server is running in ${serverPort} port!`);
});

var gsmModem = SerialPortGSM.Modem();

// Port is opened
gsmModem.on("open", () => {
  console.log(`Modem Sucessfully Opened`);

  // now we initialize the GSM Modem
  gsmModem.initializeModem((msg: object, err: object) => {
    if (err) {
      console.log(`Error Initializing Modem - ${err}`);
    } else {
      console.log(`InitModemResponse: ${JSON.stringify(msg)}`);

      // set mode to PDU mode to handle SMS
      gsmModem.setModemMode((msg: object, err: object) => {
        if (err) {
          console.log(`Error Setting Modem Mode - ${err}`);
        } else {
          console.log(`Set Mode: ${JSON.stringify(msg)}`);

          // get the Network signal strength
          gsmModem.getNetworkSignal((result: object, err: object) => {
            if (err) {
              console.log(`Error retrieving Signal Strength - ${err}`);
            } else {
              console.log(`Signal Strength: ${JSON.stringify(result)}`);
            }
          });
        }
      }, configGSM.mode);

      // get info about stored Messages on SIM card
      gsmModem.checkSimMemory((result: object, err: object) => {
        if (err) {
          console.log(`Failed to get SimMemory ${err}`);
        } else {
          console.log(`Sim Memory Result: ${JSON.stringify(result)}`);
        }
      });
    }
  });

  gsmModem.on("onNewMessageIndicator", (data: object) => {
    //indicator for new message only (sender, timeSent)
    console.log(`Event New Message Indication: ` + JSON.stringify(data));
  });

  gsmModem.on("onNewMessage", (data: object) => {
    //whole message data
    console.log(`Event New Message: ` + JSON.stringify(data));
  });

  gsmModem.on("onSendingMessage", (data: object) => {
    //whole message data
    console.log(`Event Sending Message: ` + JSON.stringify(data));
  });

  gsmModem.on("onMemoryFull", (data: object) => {
    //whole message data
    console.log(`Event Memory Full: ` + JSON.stringify(data));
  });

  gsmModem.on("close", (data: object) => {
    //whole message data
    console.log(`Event Close: ` + JSON.stringify(data));
  });
});

gsmModem.open(configGSM.serialCOM, configGSM.options);

setInterval(() => {
  // read the whole SIM card inbox
  // gsmModem.getSimInbox(
  //   (result: GSM_Response<SMS_ResponseType>, err: object) => {
  //     if (err) {
  //       console.log(`Failed to get SimInbox ${err}`);
  //     } else {
  //       console.log(`Sim Inbox Result: ${JSON.stringify(result)}`);
  //       const executedMsg: string[] = [];
  //       if (result && result.data.length > 0)
  //         result.data.forEach(async (smsData) => {
  //           if (!executedMsg.find((d) => d === smsData.msgID)) {
  //             await postRequest(smsData);
  //             executedMsg.push(smsData.msgID);
  //             gsmModem.deleteMessage(smsData);
  //           }
  //         });
  //     }
  //   }
  // );
}, 5000);

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

    gsmModem.sendSMS(smsData.sender, message, false);
  }
}
