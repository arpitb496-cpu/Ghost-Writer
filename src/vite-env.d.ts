/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
}

interface ImportMetaEnv {
  readonly VITE_WRITING_DNA_SOULBOUND_ADDRESS?: string
  /** `monad` (default) or `sepolia` */
  readonly VITE_CHAIN?: string
  readonly VITE_CHAIN_ID?: string
  readonly VITE_RPC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
