/**
 * Fallback when .env / ConfigService se Cloudinary load nahi hota (cwd, order, etc.).
 * Production mein hamesha .env / env vars use karo — yeh sirf local dev ke liye.
 * Secret rotate karo agar yeh file commit ho chuki ho.
 */
export const CLOUDINARY_FALLBACK_URL =
  'cloudinary://814615366893678:GITOy-EWr_EYWGXeerHGhXz7ZgY@dplbw40ji';
