import { defineChain, type Chain } from 'viem'
import { sepolia } from 'viem/chains'

/** Monad Testnet — https://docs.monad.xyz/developer-essentials/testnets */
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.com' },
  },
})

/**
 * Chain for wallet + contract calls.
 * - Default: Monad Testnet (matches GhostWriter / Monad Blitz usage).
 * - `VITE_CHAIN=sepolia` — Ethereum Sepolia.
 * - `VITE_CHAIN_ID` + `VITE_RPC_URL` — fully custom (e.g. tempnet); if id is 10143, MON + Monad explorer metadata apply.
 * - `VITE_RPC_URL` alone — overrides RPC for the selected preset (Monad or Sepolia).
 */
export function getAppChain(): Chain {
  const customId = import.meta.env.VITE_CHAIN_ID
  const rpc = import.meta.env.VITE_RPC_URL
  const preset = import.meta.env.VITE_CHAIN ?? 'monad'

  if (customId && rpc) {
    const id = Number(customId)
    if (id === monadTestnet.id) {
      return defineChain({
        id: monadTestnet.id,
        name: monadTestnet.name,
        nativeCurrency: monadTestnet.nativeCurrency,
        rpcUrls: { default: { http: [rpc] } },
        blockExplorers: monadTestnet.blockExplorers,
      })
    }
    return defineChain({
      id,
      name: 'Custom',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [rpc] } },
    })
  }

  if (preset === 'sepolia') {
    if (rpc) {
      return defineChain({
        id: sepolia.id,
        name: sepolia.name,
        nativeCurrency: sepolia.nativeCurrency,
        rpcUrls: { default: { http: [rpc] } },
        blockExplorers: sepolia.blockExplorers,
      })
    }
    return sepolia
  }

  if (rpc) {
    return defineChain({
      id: monadTestnet.id,
      name: monadTestnet.name,
      nativeCurrency: monadTestnet.nativeCurrency,
      rpcUrls: { default: { http: [rpc] } },
      blockExplorers: monadTestnet.blockExplorers,
    })
  }

  return monadTestnet
}
