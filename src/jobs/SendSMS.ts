import { GSMPortType, SMSResponseType } from "../@types/app";

interface IProps extends SMSResponseType {
  gsmPort: GSMPortType;
}

export default {
  key: "SendSMS",
  async handle({ data }: { data: IProps }) {
    console.log("QUEUE SEND SMS: ", data);
  },
};
