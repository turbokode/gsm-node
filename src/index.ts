import Bull from "bull";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { GSMResponseType } from "./@types/gsm";
import redisConfig from "./config/redis";
import { handleNewSMS } from "./handlers/newSMS";
import { handleOnMemoy } from "./handlers/onMemory";
import appRoutes from "./routes";
import { GSMModem } from "./services/serial-gsm";

const host = redisConfig.host;
const port = redisConfig.port;

const smsQueue = new Bull("sms_queue", `redis://${host}:${port}`);
const failedQueue = new Bull("failed_sms_queue", `redis://${host}:${port}`);

const app = express();
export const gsmModem = new GSMModem();

app.use(express.json());
app.use(cors());
appRoutes(app);

gsmModem.OnNewSMS(handleNewSMS);
gsmModem.OnMemoriSMS(handleOnMemoy);

gsmModem.checkIsReady().finally(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 The SMS server is running on port ${PORT}!`);
  });
});

const sendSMS = (msg: { number: string; message: string }) => {
  return new Promise((resolve) => {
    gsmModem.sendSMS(msg.number, msg.message, (result: GSMResponseType) => {
      const { data } = result;

      if (data.response.includes("Message Failed ERROR")) {
        console.error(`Erro ao enviar: ${data.recipient} | ${data.message}`);
        resolve(false);
      }

      if (data.response.includes("Message Successfully Sent")) {
        console.log(`Enviada: ${msg.number}`);
        console.log("====================");
        resolve(true);
      }

      if (data.response.includes("Successfully Sent to Message Queue")) {
        console.log(`Na fila: ${msg.number}`);
        resolve(true);
      }
    });
  });
};

smsQueue.process(async (job) => {
  const msg = job.data as { number: string; message: string };

  const success = await sendSMS(msg);

  if (!success) {
    await failedQueue.add({ ...msg, attempts: 1 });
    throw new Error(`Falha ao enviar: ${msg.number}`);
  }
});

// Processamento da fila de falhas
failedQueue.process(async (job) => {
  const msg = job.data;
  msg.attempts = (msg.attempts || 0) + 1;

  console.log(`Tentando reenviar: ${msg.number} | Tentativa: ${msg.attempts}`);

  const success = await sendSMS(msg);
  if (!success) {
    if (msg.attempts < 3) {
      await failedQueue.add(msg, { delay: 60000 }); // Aguardar 60s antes de tentar novamente
      throw new Error(`Tentativa ${msg.attempts} falhou: ${msg.number}`);
    } else {
      console.log(`Mensagem removida após 3 tentativas: ${msg.number}`);
    }
  } else {
    console.log(
      `Mensagem enviada com sucesso após ${msg.attempts} tentativas.`
    );
  }
});
