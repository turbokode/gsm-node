import { MessageType } from "../@types/app";

export class MessageQueue {
  private messages: MessageType[] = [];
  private msgs = new Map<number, MessageType>();
  private currentMsgKey = -1;

  /**
   *
   * @param newMessage the message that will be inserted at the end of
   * the queue
   */
  public set(newMessage: MessageType) {
    this.msgs.set(this.msgs.size + 1, newMessage);
    // this.messages.push(newMessage);
  }

  public getAll(): MessageType[] {
    return [...this.msgs.values()];
    // return this.messages;
  }

  public getNext(): MessageType | undefined {
    this.msgs.forEach((msg, key) => {
      if (!msg.sendState) this.currentMsgKey = key;
    });
    // this.messages.find((msg) => !msg.sendState);
    return this.msgs.get(this.currentMsgKey);
  }

  /**
   *
   * @param message The oldMessage with updated message content or state
   * @returns Return the updated message if it exists in the queue, if it
   * does not exist, undefined is returned
   */
  public update(message: MessageType): MessageType | undefined {
    // const index = this.messages.findIndex(
    //   (msg) => msg.phoneNumber === message.phoneNumber
    // );
    // console.log("UPDATE INDEX: ", index);

    // if (index >= 0) {
    //   this.messages.splice(index, 1);
    //   this.messages.push(message);

    //   console.log("UPDATE INDEX: ", message);

    //   return message;
    // }
    this.msgs.set(this.currentMsgKey, message);
    return message;
  }

  /**
   *
   * @param toDMsg the message to delete
   */
  public delete(toDMsg: MessageType) {
    // const index = this.messages.findIndex(
    //   (msg) => msg.phoneNumber === toDeleteMessage.phoneNumber
    // );

    // if (index) {
    //   return this.messages.splice(index, 1)[0];
    // }

    this.msgs.forEach((msg, key) => {
      if (
        msg.phoneNumber === toDMsg.phoneNumber &&
        msg.message === toDMsg.message
      ) {
        this.msgs.delete(key);
      }
    });
  }
}
