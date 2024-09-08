import SerialPortGSM from "serialport-gsm";
import { delay } from "../resources/delay";

const options = {
  baudRate: 19200,
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

export class GSMModem {
  constructor() {
    this.modem = SerialPortGSM.Modem();
    this.isReady = false;

    this.modem.on("open", (data) => {
      this.modem.initializeModem((msg, err) => {
        if (err) {
          console.log(`Error Initializing Modem - ${err}`);
        }
      });
    });

    this.modem.open("/dev/ttyUSB0", options, (err) => {
      if (err) {
        console.error(`Erro open a modem: ${err.message}`);
        return;
      }

      this.isReady = true;
      console.log("✈ Modem conected with success!");
    });
  }

  OnNewSMS(callBack) {
    this.modem.on("onNewMessage", (message) => {
      // console.log("SMS recebido:", message);
      callBack(message);
    });
  }

  deleteSMS(messageObj, callBack) {
    return new Promise((resolve, reject) => {
      this.modem.deleteMessage(messageObj, (data, err) => {
        if (err) return reject(false);

        resolve(true);

        callBack && callBack(data);
      });
    });
  }

  /**
   *
   * @param {string} phoneNumber Contanto que recebera a sms
   * @param {string} message A mensagem a ser enviada
   * @param {Function} callBack funcao de callback que sera chamada depois que enviar a menssage. O callback 'e chamado 2 vezes, a primeira para informar que a menssagem esta na fila de envio e a segunda vez para informar se foi enviada com sucesso ou nao
   */
  async sendSMS(phoneNumber, message, callBack) {
    if (!this.isReady) await this.checkIsReady();

    this.modem.sendSMS(phoneNumber, message, false, callBack);
  }

  async OnMemoriSMS(callBack) {
    if (!this.isReady) this.isReady = await this.checkIsReady();

    this.modem.getSimInbox((message) => {
      callBack(message.data);
    });
  }

  async checkIsReady() {
    await delay(500);

    return new Promise((resolve, reject) => {
      this.modem.executeCommand("ATZ", (result, err) => {
        if (err) {
          reject(false);
          console.log(`Error - ${err}`);
        } else resolve(true);
      });
    });
  }
}

/**
   * Corpo da primeira notificaca:
   * {
        status: 'success',
        request: 'sendSMS',
        data: {
          messageId: 'VSyaoxbVwOMFaGbJs1ySt0Va3',
          response: 'Successfully Sent to Message Queue'
        }
      }

   *Corpo da segunda notificacao:
   {
      status: 'success',
      request: 'SendSMS',
      data: {
        messageId: 'VSyaoxbVwOMFaGbJs1ySt0Va3',
        message: 'Hello there Zab!',
        recipient: '+258844825696',
        response: 'Message Successfully Sent'
      }
    }

     Send sms callBack:  {
1|GSM Ctrl  |   status: 'fail',
1|GSM Ctrl  |   request: 'SendSMS',
1|GSM Ctrl  |   data: {
1|GSM Ctrl  |     messageId: 'UheWDVqbXtSjTddn2JsWroW82',
1|GSM Ctrl  |     message: 'Para ativar o dispositivo envie uma mensagem com a estrutura correta!\n' +
1|GSM Ctrl  |       '--\n' +
1|GSM Ctrl  |       'Ajuda: .',
1|GSM Ctrl  |     recipient: '+258844825696',
1|GSM Ctrl  |     response: 'Message Failed ERROR'
1|GSM Ctrl  |   }
1|GSM Ctrl  | }
   */
