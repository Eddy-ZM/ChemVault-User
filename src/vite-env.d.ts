/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHEMVAULT_USER_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
