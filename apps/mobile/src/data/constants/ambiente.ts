const fallbackLocal = "http://localhost:3001";

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackLocal
).trim();

export const URL_BASE = apiBaseUrl.replace(/\/$/, "");

export const GOOGLE_ANDROID_CLIENT_ID = (
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ""
).trim();
