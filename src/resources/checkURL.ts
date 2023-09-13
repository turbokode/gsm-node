import axios, { AxiosError } from "axios";

let tryCounter = 0;

export async function checkGSM_URL() {
  tryCounter++;

  try {
    if (process.env.GSM_PORT) {
      const res = await axios.get(`${process.env.GSM_PORT}/`);

      if (res.status !== 200) {
        throw new Error("The GSM URL is not working good!");
      }
    }
  } catch (error) {
    const err = error as string | undefined | AxiosError;

    if (tryCounter === 5) {
      await sleep(1000);

      if (err instanceof AxiosError) throw new Error(err.message);

      throw new Error(err);
    }

    await checkGSM_URL();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
