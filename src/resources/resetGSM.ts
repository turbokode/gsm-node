import { AutoDetectTypes } from "@serialport/bindings-cpp";
import { Gpio } from "onoff";
import { ReadlineParser, SerialPort } from "serialport";

// Configuração do pino GPIO 23 como saída em nível alto (HIGH)
const resetPin = new Gpio(23, "high");

export function resetGSM(
  port: SerialPort<AutoDetectTypes>,
  parser: ReadlineParser,
  callBack?: () => Promise<void>
) {
  console.log("Trying to restart GSM!");
  let tryCounter = 0;

  return new Promise(async (resolve, reject) => {
    try {
      // Coloca o pino em nível baixo (LOW) por um curto período de tempo
      resetPin.writeSync(0);
      await sleep(100);

      // Volta o pino ao nível alto (HIGH)
      resetPin.writeSync(1);

      const interval = setInterval(() => {
        if (tryCounter > 5) {
          clearInterval(interval);
          parser.removeListener("data", onData);
          throw new Error("Time to try connect to GSM expired!");
        }

        port.write("AT\r\n");
        tryCounter++;
      }, 10000);

      const onData = async (data: string) => {
        console.log("RESET EVENT LISTENER DATA: ", [data]);

        if (data.replace("\r", "") === "OK") {
          clearInterval(interval);
          parser.removeListener("data", onData);

          callBack && (await callBack());

          console.log("GSM RESTARTED!");
          resolve;
        }
      };

      parser.on("data", onData);
    } catch (error) {
      console.error("Error when try to restart GSM:", error);
      reject;
    }
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
