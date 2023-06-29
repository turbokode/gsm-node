export function isHexMessage(message: string): boolean {
  // Verifica se a mensagem contém apenas caracteres hexadecimais
  const hexPattern = /^[0-9A-Fa-f]+$/;
  return hexPattern.test(message);
}
