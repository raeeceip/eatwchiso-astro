/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CLOUDFLARE_WORKER_URL: string;
  readonly PUBLIC_CLOUDFLARE_API_KEY: string;
  readonly PUBLIC_RESEND_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}