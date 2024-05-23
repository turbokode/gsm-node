import cors from "cors";
import "dotenv/config";
import express from "express";
import { handleNewSMS } from "./handlers/newSMS";
import { handleOnMemoy } from "./handlers/onMemory";
import appRoutes from "./routes";
import { GSMModem } from "./services/serial-gsm";

const port = process.env.PORT;

const app = express();
export const gsmModem = new GSMModem();

app.use(express.json());
app.use(cors());

appRoutes(app);

gsmModem.OnNewSMS(handleNewSMS);
gsmModem.OnMemoriSMS(handleOnMemoy);

gsmModem.checkIsReady().finally(() => {
  app.listen(port, async () => {
    console.log(`🚀 The SMS server is running in ${port} port!`);
  });
});
