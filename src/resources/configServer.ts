import { api } from "../api/server";
import { notifications } from "./notifications";

let tryCounter = 0;

export async function configServer(
  callBack?: (phoneNumber: string, message: string) => void
) {
  tryCounter++;

  return new Promise((resolve, reject) => {
    api
      .post(
        "/configSystem/save",
        { smsServerURL: process.env.GSM_PORT },
        {
          headers: {
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTMwMjYxMzYsImV4cCI6MTAzMzI5Mzk3MzYsInN1YiI6ImQ2MTY4ODk3LWI1MGMtNGE5Yy04ZTg3LWZmYjNlMmY1ZTBmNSJ9.1a9lMAmQjIEoVWUkAnNa46K-aJbSSmLbiFjfdjPlcoQ",
          },
        }
      )
      .then(({ data }) => {
        resolve(JSON.stringify(data));
      })
      .catch(async ({ data }) => {
        if (tryCounter === 10) {
          await notifications("NET_OFF", callBack);

          await sleep(1000);

          reject(
            `Failed when try to send SMS Server URL to API! \n==========\n${data} `
          );
        }

        await configServer();
      })
      .finally(() => {
        tryCounter = 0;
      });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
