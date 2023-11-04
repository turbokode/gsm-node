import { SerialPort } from "serialport";
const Modem = require("./functions/modem");

const SerialPortGSM = {
  serialport: SerialPort,
  list: function (callback: (error?: object | null, results?: object) => void) {
    if (callback === undefined) {
      return SerialPort.list();
    }
    SerialPort.list()
      .then((results: object) => callback(null, results))
      .catch((error: object) => callback(error));
  },
  Modem: function (params?: object) {
    return new Modem(SerialPort);
  },
};

export { SerialPortGSM };
