const validStringRegex = /[\S\s]+[\S]+/;

export function isStringEmpty(str?: string | (() => string)): boolean {
  if (validStringRegex.test(str as string)) return false;
  return true;
}

export function isNumberEmpty(num: unknown): boolean {
  if (isNaN(num as number)) return true;
  if (num != null) return false;
  return true;
}

export function isArrayEmpty(arr: unknown): boolean {
  if (Array.isArray(arr) && arr.length > 0) return false;
  return true;
}

export function isObjectEmpty(obj: { [key: string]: any }): boolean {
  if (
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    obj !== null &&
    obj !== undefined &&
    Object.keys(obj).length > 0
  ) {
    return false;
  }
  return true;
}

export function isEmpty(value: unknown): boolean {
  if (typeof value === "string" && isNaN(value as unknown as number))
    return isStringEmpty(value);

  if (!isNaN(value as unknown as number)) return isNumberEmpty(value);

  if (Array.isArray(value)) return isArrayEmpty(value);

  if (!Array.isArray(value))
    return isObjectEmpty(value as { [key: string]: any });

  return true;
}
