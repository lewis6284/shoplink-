/**
 * Utility to crypt sequential integer IDs into reversible, scrambled 5-character alphanumeric codes.
 * Uses modular arithmetic with a large prime modulus and modular multiplicative inverse.
 */

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length; // 36
const MODULUS = 60466169; // A prime number close to 36^5 - 1 (60,466,175)
const MULTIPLIER = 35461223; // Co-prime multiplier to Modulus
const MULTIPLIER_INV = 49347680; // Modular multiplicative inverse of MULTIPLIER modulo MODULUS

/**
 * Converts a number to its Base36 representation, padded to exactly 5 characters.
 */
function base36Encode(num) {
    let result = "";
    let temp = num;
    for (let i = 0; i < 5; i++) {
        const remainder = temp % BASE;
        result = ALPHABET[remainder] + result;
        temp = Math.floor(temp / BASE);
    }
    return result;
}

/**
 * Converts a 5-character Base36 representation back to a number.
 */
function base36Decode(str) {
    let num = 0;
    const cleanStr = str.toUpperCase();
    for (let i = 0; i < cleanStr.length; i++) {
        const char = cleanStr[i];
        const val = ALPHABET.indexOf(char);
        if (val === -1) {
            throw new Error(`Invalid character in code: ${char}`);
        }
        num = num * BASE + val;
    }
    return num;
}

/**
 * Encodes an integer ID into a scrambled 5-character alphanumeric code.
 */
function encodeInvoiceId(id) {
    if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
        throw new Error("ID must be a positive integer");
    }
    // Scramble the ID using linear modular scrambling
    // Use BigInt to prevent integer overflow during multiplication
    const scrambled = Number((BigInt(id) * BigInt(MULTIPLIER)) % BigInt(MODULUS));
    return base36Encode(scrambled);
}

/**
 * Decodes a scrambled 5-character alphanumeric code back to its original integer ID.
 */
function decodeInvoiceId(code) {
    if (typeof code !== "string" || code.length !== 5) {
        throw new Error("Code must be a 5-character string");
    }
    const scrambled = base36Decode(code);
    // Unscramble using modular multiplicative inverse
    const id = Number((BigInt(scrambled) * BigInt(MULTIPLIER_INV)) % BigInt(MODULUS));
    return id;
}

module.exports = {
    encodeInvoiceId,
    decodeInvoiceId
};
