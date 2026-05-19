// Lightweight env-presence check that does NOT import the Firebase SDK.
// Imported by Home + other always-loaded code so the SDK stays in the
// lazy chunk used by pool routes only.

export function isFirebaseConfigured(): boolean {
  // Emulator mode doesn't need real env vars — emulator ignores keys.
  if (import.meta.env.VITE_USE_EMULATOR === '1') return true;
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  );
}
