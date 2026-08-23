// config/env.ts
// ══════════════════════════════════════════════════════════════════════════════
// Loads variables from the .env file and re-exports them, typed, for use
// across page objects, API helpers, and spec files.
// ══════════════════════════════════════════════════════════════════════════════

import 'dotenv/config';

export const BASE_URL: string         = process.env.BASE_URL ?? '';
export const API_URL: string          = process.env.API_URL ?? '';
export const EMAIL: string            = process.env.EMAIL ?? '';
export const PASSWORD: string         = process.env.PASSWORD ?? '';
export const INVALID_PASSWORD: string = process.env.INVALID_PASSWORD ?? '';
export const AUTHOR_USERNAME: string  = process.env.AUTHOR_USERNAME ?? '';

// Fail fast with a clear message if the .env file is missing/incomplete,
// instead of letting tests fail later with a confusing "undefined" error.
const required: Record<string, string> = {
  BASE_URL,
  API_URL,
  EMAIL,
  PASSWORD,
  INVALID_PASSWORD,
  AUTHOR_USERNAME,
};

for (const [key, value] of Object.entries(required)) {
  if (!value) {
    throw new Error(
      `❌ Missing "${key}" in .env — copy .env.example to .env and fill in real values.`
    );
  }
}
