import { z } from "zod";

type Provider = "VODACOM" | "MCEL" | "MOVITEL" | "ALL";

// Regex para validação
const regex = {
  email: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
  phone: {
    VODACOM: /^(?:\+258|258)?8[45][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/,
    MCEL: /^(?:\+258|258)?8[23][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/,
    MOVITEL: /^(?:\+258|258)?8[67][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/,
    ALL: /^(?:\+258|258)?8[2-7][-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/,
  },
};



// Esquema Zod para email
const emailSchema = z.string().email("Invalid email format");

// Mapeamento de esquemas de validação para cada provider
const phoneSchemas: Record<Provider, z.ZodString> = {
  VODACOM: z.string().regex(regex.phone.VODACOM, "Invalid VODACOM phone number"),
  MCEL: z.string().regex(regex.phone.MCEL, "Invalid MCEL phone number"),
  MOVITEL: z.string().regex(regex.phone.MOVITEL, "Invalid MOVITEL phone number"),
  ALL: z.string().regex(regex.phone.ALL, "Invalid Mozambique phone number"),
};

/**
 * Valida se o email é válido.
 * @param value - Email a ser validado.
 * @returns Retorna true se o email for válido, false caso contrário.
 */
export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

/**
 * Valida se o número de telefone é válido com base no provedor.
 * @param value - Número de telefone a ser validado.
 * @param provider - Provedor de serviço (VODACOM, MCEL, MOVITEL ou ALL).
 * @returns Retorna true se o número for válido, false caso contrário.
 */
export function isValidPhoneNumber(
  value?: string | null,
  provider: Provider = "ALL"
): boolean {
  if (!value) return false;
  return phoneSchemas[provider].safeParse(value).success;
}
