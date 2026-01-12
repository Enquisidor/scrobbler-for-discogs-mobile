import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

/**
 * Crypto adapter for React Native
 * Uses expo-crypto for simple hashing and crypto-js for HMAC operations
 */

/**
 * Generate HMAC-SHA1 signature (used for Discogs OAuth 1.0a)
 * Note: expo-crypto doesn't support HMAC, so we use crypto-js
 *
 * @param message - The message to sign
 * @param key - The signing key
 * @returns Base64-encoded signature
 */
export function hmacSha1Base64(message: string, key: string): string {
  const signature = CryptoJS.HmacSHA1(message, key);
  return CryptoJS.enc.Base64.stringify(signature);
}

/**
 * Generate MD5 hash (used for Last.fm API signatures)
 * @param message - The message to hash
 * @returns Hex-encoded hash
 */
export async function md5(message: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    message,
    {
      encoding: Crypto.CryptoEncoding.HEX,
    }
  );
  return hash;
}

/**
 * RFC 3986 URL encoding (for OAuth)
 */
export function rfc3986encode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}
