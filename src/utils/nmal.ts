// src/nmal.ts

// Defining the NLGmal characters
const NLGmal_chars: string = "0123456789mnopqrstuvwxyz";

const base: number = NLGmal_chars.length;

// Dictionary for quick look-up of character values
const char_to_value: { [key: string]: number } = Object.fromEntries(
  NLGmal_chars.split('').map((char, idx) => [char, idx])
);

/**
 * Convert a decimal number to an NLGmal number.
 * @param decimal - The decimal number to convert
 * @returns The NLGmal representation of the decimal number
 */
export function decimalToNlgmal(decimal: number): string {
  if (decimal === 0) {
    return NLGmal_chars[0];
  }

  let nlgmal: string = "";
  while (decimal > 0) {
    nlgmal = NLGmal_chars[decimal % base] + nlgmal;
    decimal = Math.floor(decimal / base);
  }
  return nlgmal;
}

/**
 * Convert an NLGmal number to a decimal number.
 * @param nlgmal - The NLGmal number to convert
 * @returns The decimal representation of the NLGmal number
 */
export function nlgmalToDecimal(nlgmal: string): number {
 // Check for capital letters and issue a warning
 if (nlgmal.match(/[A-Z]/)) {
  console.warn("Warning: Capital letters detected. It's good to use lowercase letters. Please be careful next time :)");
  nlgmal = nlgmal.toLowerCase();
}

  let decimal: number = 0;
  for (const char of nlgmal) {
    decimal = decimal * base + char_to_value[char];
  }
  return decimal;
}

/**
 * Convert bytes to an NLGmal string.
 * @param byteData - The byte data to convert
 * @returns The NLGmal representation of the byte data
 */
export function bytesToNlgdecimal(byteData: Uint8Array): string {
  // Convert bytes to a decimal number
  const decimalNumber: number = parseInt(Buffer.from(byteData).toString('hex'), 16);
  // Convert decimal number to NLGmal
  return decimalToNlgmal(decimalNumber);
}

/**
 * Convert an NLGmal string to bytes.
 * @param nlgdecimal - The NLGmal string to convert
 * @returns The byte representation of the NLGmal string
 */
export function nlgdecimalToBytes(nlgdecimal: string): Uint8Array {
  // Convert NLGmal to decimal number
  const decimalNumber: number = nlgmalToDecimal(nlgdecimal);
  // Convert decimal number to bytes
  // Determine the number of bytes required
  const numBytes: number = Math.ceil(decimalNumber.toString(16).length / 2);
  const buffer: Buffer = Buffer.alloc(numBytes);
  buffer.writeUIntBE(decimalNumber, 0, numBytes);
  return new Uint8Array(buffer);
}
/**
 * Convert a hash (hex string) to an NLGmal string.
 * @param hash - The hash to convert (hex string)
 * @returns The NLGmal representation of the hash
 */
export function hashToNlgmal(hash: string): string {
  // Convert the hash hex string to a decimal number
  const decimalNumber: number = parseInt(hash, 16);
  // Convert the decimal number to NLGmal format
  return decimalToNlgmal(decimalNumber);
}

/**
 * Convert an NLGmal string back to a hash (hex string).
 * @param nlgmalHash - The NLGmal string to convert
 * @returns The original hash as a hex string
 */
export function nlgmalToHash(nlgmalHash: string): string {
  // Convert the NLGmal string back to a decimal number
  const decimalNumber: number = nlgmalToDecimal(nlgmalHash);
  // Convert the decimal number to a hex string
  return decimalNumber.toString(16);
}

// Export the base and characters if needed
export const NLGmalBase = base;
export const NLGmalChars = NLGmal_chars;