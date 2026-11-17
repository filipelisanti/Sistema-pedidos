/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Por defecto '/api' (mismo dominio; en desarrollo lo redirige Vite). */
  readonly VITE_API_URL?: string;
}
