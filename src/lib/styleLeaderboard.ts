import {
  type Address,
  type PublicClient,
  createPublicClient,
  http,
  type Chain,
} from 'viem'
import { hashWritingDNA, type WritingDNA } from './writingDNA'
import { styleLeaderboardAbi } from './styleLeaderboardAbi'

export type FormalityU8 = 0 | 1 | 2

export function formalityToU8(f: WritingDNA['formality']): FormalityU8 {
  if (f === 'casual') return 0
  if (f === 'professional') return 1
  return 2
}

export function formalityLabel(u: number): string {
  if (u === 0) return 'Casual'
  if (u === 1) return 'Professional'
  if (u === 2) return 'Academic'
  return 'Unknown'
}

export interface LeaderboardRow {
  wallet: Address
  dnaHash: `0x${string}`
  formality: number
  wordCount: number
  lastPublishedAt: number
  publishCount: number
  /** UI-only rows for hackathon / empty registry preview */
  isDemo?: boolean
}

function readRpc(chain: Chain): string {
  const url = chain.rpcUrls?.default?.http?.[0]
  if (!url) throw new Error('Chain has no default RPC')
  return url
}

export function createLeaderboardPublicClient(chain: Chain): PublicClient {
  return createPublicClient({
    chain,
    transport: http(readRpc(chain)),
  })
}

export async function fetchLeaderboard(
  client: PublicClient,
  contractAddress: Address
): Promise<LeaderboardRow[]> {
  const count = await client.readContract({
    address: contractAddress,
    abi: styleLeaderboardAbi,
    functionName: 'participantCount',
  })

  const n = Number(count)
  if (n === 0) return []

  const wallets = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      client.readContract({
        address: contractAddress,
        abi: styleLeaderboardAbi,
        functionName: 'participantAt',
        args: [BigInt(i)],
      })
    )
  )

  const rows: LeaderboardRow[] = []
  for (const w of wallets) {
    const e = await client.readContract({
      address: contractAddress,
      abi: styleLeaderboardAbi,
      functionName: 'entries',
      args: [w],
    })
    rows.push({
      wallet: w,
      dnaHash: e[0],
      formality: Number(e[1]),
      wordCount: Number(e[2]),
      lastPublishedAt: Number(e[3]) * 1000,
      publishCount: Number(e[4]),
    })
  }

  rows.sort((a, b) => {
    if (b.publishCount !== a.publishCount) return b.publishCount - a.publishCount
    if (b.wordCount !== a.wordCount) return b.wordCount - a.wordCount
    return b.lastPublishedAt - a.lastPublishedAt
  })

  return rows
}

/** Clamp for uint32 on-chain */
export function wordCountForChain(wordCount: number): number {
  const max = 0xffffffff
  return Math.max(1, Math.min(Math.floor(wordCount), max))
}

export function stampForPublish(dna: WritingDNA): {
  dnaHash: `0x${string}`
  formality: FormalityU8
  wordCount: number
} {
  return {
    dnaHash: hashWritingDNA(dna),
    formality: formalityToU8(dna.formality),
    wordCount: wordCountForChain(dna.wordCount),
  }
}
