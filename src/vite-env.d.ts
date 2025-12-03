/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_OPENAI_API_KEY?: string;
    readonly VITE_OPENAI_MODEL?: string;
    readonly VITE_OPENAI_API_BASE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module "*.wasm?url" {
  const value: string;
  export default value;
}
