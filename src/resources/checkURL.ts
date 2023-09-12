import axios from "axios";

let tryCounter = 0;

export async function checkGSM_URL() {
  tryCounter++;

  process.env.GSM_PORT &&
    axios
      .get(`${process.env.GSM_PORT}/`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("The GSM URL is not working good!");
        }
      })
      .catch(async (err) => {
        if (tryCounter === 5) {
          await sleep(1000);

          throw new Error(err);
        }

        await checkGSM_URL();
      });
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
