// Wrangler cannot infer secret names because their values live outside source control.
// This augments the generated Env without duplicating any config-derived bindings.
declare global {
  interface Env {
    ADMIN_PASSWORD: string;
    SESSION_SECRET: string;
  }
}

export {};
