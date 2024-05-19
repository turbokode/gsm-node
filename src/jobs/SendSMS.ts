import { MessageType } from "../@types/app";

interface IProps extends MessageType {
  gsmPort: Object;
}

export default {
  key: "SendSMS",
  async handle({ data }: { data: IProps }) {
    console.log("QUEUE NEW SMS: ", data);
  },
};
