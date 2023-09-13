import { NotificationType, SystemNotificationType } from "../@types/app";
import { api } from "../api/server";

export async function notifications(
  type: SystemNotificationType,
  addToSendQueue?: (phoneNumber: string, message: string) => void,
  notificationRegister?: NotificationType[]
) {
  console.log("Notification: ", type);

  // notificationRegister?.forEach((notification) => {
  //   switch (notification.type) {
  //     case "NET_OFF":
  //       break;
  //     case "SMS_LOS":
  //       break;
  //     case "GSM_OFF":
  //       break;
  //     case "BAD_REQUEST":
  //       break;
  //   }
  // });

  try {
    if (type === "NET_OFF") {
      const notificationMessage =
        "SWITCH MASTER ERROR:\n\n O sistema de SMS não conseguiu se conectar ao servidor central!";
      if (addToSendQueue && process.env.ALERT_PHONE_NUMBER)
        addToSendQueue(process.env.ALERT_PHONE_NUMBER, notificationMessage);
    } else {
      switch (type) {
        case "BAD_REQUEST":
          const errMessage1 =
            "Error in trying to execute a central server request, this error may have happened because of a system problem or internet connection. Please try again later if the error persists contact maintenance.";
          await api.post("/notifications/", {
            type: "err",
            description: errMessage1,
          });
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
  } catch (error) {
    console.log(error);
  }
}
