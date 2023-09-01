import { api } from "../api/server";

type SystemNotificationType = "NET_OFF" | "SMS_LOS" | "GSM_OFF" | "BAD_REQUEST";
type NotificationContentType = { code?: string; message: string };

export async function notifications(
  type: SystemNotificationType,
  addToSendQueue: (phoneNumber: string, message: string) => void,
  content?: NotificationContentType
) {
  if (type === "NET_OFF") {
    const notificationMessage =
      "SWITCH MASTER ERROR:\n\n O sistema de SMS não conseguiu se conectar ao servidor central!";

    process.env.ALERT_PHONE_NUMBER &&
      addToSendQueue(process.env.ALERT_PHONE_NUMBER, notificationMessage);
  } else {
    switch (type) {
      case "BAD_REQUEST":
        break;
      case "SMS_LOS":
        const errMessage =
          "Error when trying to send a message, the SIM CARD may be out of balance, please recharge the card, if the problem persist, notify maintenance.";
        await api.post("/notifications/", {
          type: "err",
          description: errMessage,
        });
        break;
      case "GSM_OFF":
        const errMessage2 =
          "Error communicating with the sms sending module, manually restart the system, if the problem persists, please contact maintenance.";
        await api.post("/notifications/", {
          type: "err",
          description: errMessage2,
        });
        break;
      default:
        const errMessage3 =
          "Unexpected error in sms system, manually restart the system, if the problem persists, please contact maintenance.";
        await api.post("/notifications/", {
          type: "err",
          description: errMessage3,
        });
        break;
    }
  }
}
