export function hexToString(hex: string): string {
  const buffer = Buffer.from(hex, "hex");
  return buffer.toString("utf8");
}
