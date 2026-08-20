/**
 * validators.js — Shared input-validation helpers.
 */

/** Basic email format check (RFC 5322 simplified). */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Firebase Auth requires passwords ≥ 6 characters. */
export function isValidPassword(password, minLength = 6) {
  return typeof password === "string" && password.length >= minLength;
}

/** Non-empty string with at least `minLength` characters. */
export function isNonEmpty(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}
