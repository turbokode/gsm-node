import { api } from "../api/server";

let tryCounter = 0;

export async function configServer() {
  tryCounter++;

  console.log("SERVER CONFIG: ", { smsServerURL: process.env.GSM_PORT });

  return;

  return new Promise((resolve, reject) => {
    api
      .post("/config_sms_server", { smsServerURL: process.env.GSM_PORT })
      .then(({ data }) => {
        resolve(JSON.stringify(data));
      })
      .catch(async (err) => {
        if ((tryCounter = 5))
          reject("Failed when try to send SMS Server URL to API!");

        await configServer();
      })
      .finally(() => {
        tryCounter = 0;
      });
  });
}
