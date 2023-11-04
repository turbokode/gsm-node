import { configGSM } from "./resources/configParams";
import { SerialPortGSM } from "./serialport-gsm/lib";

var gsmModem = SerialPortGSM.Modem();

let phone = {
  name: "Dario Pacule",
  number: "+258844825696",
  numberSelf: "+258844825696",
  mode: "PDU",
};

// Port is opened
gsmModem.on("open", () => {
  console.log(`Modem Sucessfully Opened`);

  // now we initialize the GSM Modem
  gsmModem.initializeModem((msg: object, err: object) => {
    if (err) {
      console.log(`Error Initializing Modem - ${err}`);
    } else {
      console.log(`InitModemResponse: ${JSON.stringify(msg)}`);

      console.log(`Configuring Modem for Mode: ${phone.mode}`);
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
      }, phone.mode);

      // get info about stored Messages on SIM card
      gsmModem.checkSimMemory((result: object, err: object) => {
        if (err) {
          console.log(`Failed to get SimMemory ${err}`);
        } else {
          gsmModem.deleteAllSimMessages();
          console.log(`Sim Memory Result: ${JSON.stringify(result)}`);
        }
      });
    }
  });

  // // read the whole SIM card inbox
  // gsmModem.getSimInbox((result: object, err: object) => {
  //   if (err) {
  //     console.log(`Failed to get SimInbox ${err}`);
  //   } else {
  //     console.log(`Sim Inbox Result: ${JSON.stringify(result)}`);
  //   }
  // });

  // // Finally send an SMS
  // const message = `Hello ${phone.name}, Try again....This message was sent`;
  // gsmModem.sendSMS(phone.number, message, false, (result: any) => {
  //   console.log(
  //     `Callback Send: Message ID: ${result.data.messageId},` +
  //       `${result.data.response} To: ${result.data.recipient} ${JSON.stringify(
  //         result
  //       )}`
  //   );
  // });

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

setTimeout(() => {
  gsmModem.close(() => process.exit);
}, 90000);
