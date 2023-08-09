import { addToSendQueue } from "..";
import Messaging from "../messaging";

const kafka = new Messaging();

async function newApiSMS(): Promise<void> {
  try {
    await kafka.get("new.apiSMS", async (err, data) => {
      if (err) throw err;
      if (data) {
        const { phoneNumber, message } = JSON.parse(data) as {
          phoneNumber: string;
          message: string;
        };

        addToSendQueue(phoneNumber, message);
      }
    });
  } catch (error) {
    console.log("error on consumer:");
    console.error(error);

    await kafka.disconnect({ module: "cons" });
    throw error;
  }
}

export default { newApiSMS };
