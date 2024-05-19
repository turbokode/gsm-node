import SerialPortGSM from "serialport-gsm";

const options = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  rtscts: false,
  xon: false,
  xoff: false,
  xany: false,
  autoDeleteOnReceive: true,
  pin: "",
  customInitCommand: "",
  cnmiCommand: "AT+CNMI=2,1,0,2,1",
  // logger: console
};

// Configuração do modem
export class GSMModem {
  constructor() {
    this.modem = SerialPortGSM.Modem();

    this.modem.on("open", (data) => {
      // console.log("OPEN DATA: ", data);

      this.modem.initializeModem((data) => {
        // console.log("Init DATA: ", data);
      });
    });

    this.modem.open("/dev/ttyUSB0", options, (err) => {
      if (err) {
        console.error(`Erro open a modem: ${err.message}`);
        return;
      }

      this.modem.deleteAllSimMessages((data) => {
        console.log("Deleted: ", data);
      });

      console.log("Modem conected with success!");

      // this.modem.sendSMS("+258844825696", "Hello there Zab!", false, (data) => {
      //   console.log("SMS SEND: ", data);
      //   /**
      //    * ELe ao enviar chama o callBack 2 vezes, primeiro para informar que a
      //    * menssagem esta na fila de envio e depois para dizer se foi enviada
      //    * com sucesso ou nao!
      //    *
      //    * Corpo da primeira notificaca:
      //    * {
      //         status: 'success',
      //         request: 'sendSMS',
      //         data: {
      //           messageId: 'VSyaoxbVwOMFaGbJs1ySt0Va3',
      //           response: 'Successfully Sent to Message Queue'
      //         }
      //       }

      //    *Corpo da segunda notificacao:
      //    {
      //       status: 'success',
      //       request: 'SendSMS',
      //       data: {
      //         messageId: 'VSyaoxbVwOMFaGbJs1ySt0Va3',
      //         message: 'Hello there Zab!',
      //         recipient: '+258844825696',
      //         response: 'Message Successfully Sent'
      //       }
      //     }
      //    */
      // });
    });
  }

  OnNewSMS(callBack) {
    this.modem.on("onNewMessage", (message) => {
      console.log("SMS recebido:", message);

      callBack(message);
    });
  }

  OnMemoriSMS(callBack) {
    this.modem.getSimInbox((message) => {
      // console.log("SMS na memoria:", message);

      callBack(message);
    });
  }
}
