/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse de l'API en production (facultatif ; par défaut « /api » sur le même site). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
