/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_FORMSPREE_ENDPOINT?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly TINA_PUBLIC_CLIENT_ID?: string;
  readonly TINA_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
