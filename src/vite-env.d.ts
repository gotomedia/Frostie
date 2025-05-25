/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OPEN_FOOD_FACTS_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}