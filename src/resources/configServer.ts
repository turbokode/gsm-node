import { api } from "../api/server";

let tryCounter = 0;

export async function configServer() {
  tryCounter++;

  return new Promise((resolve, reject) => {
    api
      .post("/configSystem/save", { smsServerURL: process.env.GSM_PORT })
      // .then(({ data }) => {
      //   resolve(JSON.stringify(data));
      // })
      // .catch(async (err) => {
      //   if (tryCounter === 5) {
      //     reject(
      //       `Failed when try to send SMS Server URL to API! \n==========\n${err} `
      //     );
      //   }

      //   await sleep(100);

      //   await configServer();
      // })
      .finally(() => {
        tryCounter = 0;
      });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
