export function processUserMessage(userMessage: string[]) {
  const selectPhoneNumberRegex = /"\+258([0-9]+)"/;
  const math = userMessage[1].match(selectPhoneNumberRegex);
  let messageProps = { content: "", phoneNumber: "" };

  if (math && math[1]) {
    messageProps = { phoneNumber: math[1], content: userMessage[2] };
  }

  return messageProps;
}
