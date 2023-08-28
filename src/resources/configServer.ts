import { api } from "../api/server";

let tryCounter = 0;

export async function configServer() {
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
      .catch(async (err) => {
        if (tryCounter === 5)
          reject(
            `Failed when try to send SMS Server URL to API! \n==========\n${err} `
          );

        await sleep(100);

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
