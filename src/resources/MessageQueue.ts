import { MessageType } from "../@types/app";

export class MessageQueue {
  private msgs = new Map<number, MessageType>();
  private currentMsgKey = -1;

  /**
   *
   * @param newMessage the message that will be inserted at the end of
   * the queue
   */
  public set(newMessage: MessageType) {
    this.msgs.set(this.msgs.size + 1, newMessage);
  }

  public getAll(): MessageType[] {
    return [...this.msgs.values()];
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
    this.msgs.set(this.currentMsgKey, message);
    return message;
  }

  /**
   *
   * @param toDMsg the message to delete
   */
  public delete(toDMsg: MessageType) {
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
