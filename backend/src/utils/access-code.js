import { customAlphabet } from 'nanoid';

// Sin caracteres ambiguos (0/O, 1/I/L). 20 caracteres ≈ 99 bits: el enlace del cliente no se puede adivinar.
const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const generateAccessCode = customAlphabet(alphabet, 20);
