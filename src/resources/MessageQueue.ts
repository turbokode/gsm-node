type MessageType = {
  phoneNumber: string;
  message: string;
  sendState?: boolean;
};

export class MessageQueue {
  private messages: MessageType[] = [];

  /**
   *
   * @param newMessage the message that will be inserted at the end of
   * the queue
   */
  public set(newMessage: MessageType) {
    this.messages.push(newMessage);
  }

  public getAll(): MessageType[] {
    return this.messages;
  }

  public getNext(): MessageType | undefined {
    const message = this.messages.find((msg) => !msg.sendState);
    return message;
  }

  /**
   *
   * @param message The oldMessage with updated message content or state
   * @returns Return the updated message if it exists in the queue, if it
   * does not exist, undefined is returned
   */
  public update(message: MessageType): MessageType | undefined {
    const index = this.messages.findIndex(
      (msg) => msg.phoneNumber === message.phoneNumber
    );

    if (index) {
      const updatedMessage = (this.messages[index] = message);

      return updatedMessage;
    }

    return;
  }

  /**
   *
   * @param toDeleteMessage the message to delete
   * @returns return the deleted message or undefined if it does exist
   * on the Queue
   */
  public delete(toDeleteMessage: MessageType) {
    const index = this.messages.findIndex(
      (msg) => msg.phoneNumber === toDeleteMessage.phoneNumber
    );

    if (index) {
      return this.messages.splice(index, 1)[0];
    }

    return;
  }
}
