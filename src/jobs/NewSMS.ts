import { SMSResponseType } from "../@types/app";
import { api } from "../api/server";

export default {
  key: "NewSMS",
  async handle({ data }: { data: SMSResponseType }) {
    console.log("QUEUE NEW SMS: ", data);

    await api.post("/system_gate_way", {
      phoneNumber: `+${data.sender}`,
      content: data.message,
    });
  },
};
