import axios from "axios";

export async function checkGSM_URL() {
  process.env.GSM_PORT &&
    axios
      .post(process.env.GSM_PORT)
      .catch((err) => {
        throw new Error(err);
      })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("The GSM URL is not working good!");
        }
      });
}
