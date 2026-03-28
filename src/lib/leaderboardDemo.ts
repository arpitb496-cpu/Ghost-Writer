import { keccak256, stringToBytes } from 'viem'
import type { LeaderboardRow } from './styleLeaderboard'

/** Fake wallets for UI demo only — not real users. */
const DEMO_WALLETS = [
  '0x7E57a12c5aEF5bfF8B126CE178413f404Bd65F78',
  '0x9A2F0c3d1E8B7a6C5D4e3F2109a8B7c6D5e4F321',
  '0x1aD4B87652cF09dAA54e2B90E6c3F0a2B8e9C456',
  '0x4BcC88e0F72D2a91A3b5E7f1C9d6E8a0B2c4D678',
] as const

function demoHash(seed: string): `0x${string}` {
  return keccak256(stringToBytes(`ghostwriter-leaderboard-demo:${seed}`))
}

/** Illustrative rows for “Most Active GhostWriters on Monad” — merge with on-chain data when demo is enabled. */
export function getLeaderboardDemoRows(): LeaderboardRow[] {
  const now = Date.now()
  return [
    {
      wallet: DEMO_WALLETS[0],
      dnaHash: demoHash('neon-quill'),
      formality: 1,
      wordCount: 18_420,
      lastPublishedAt: now - 45 * 60_000,
      publishCount: 42,
      isDemo: true,
    },
    {
      wallet: DEMO_WALLETS[1],
      dnaHash: demoHash('memo-meridian'),
      formality: 0,
      wordCount: 9_850,
      lastPublishedAt: now - 3 * 60 * 60_000,
      publishCount: 31,
      isDemo: true,
    },
    {
      wallet: DEMO_WALLETS[2],
      dnaHash: demoHash('syntax-scholar'),
      formality: 2,
      wordCount: 24_100,
      lastPublishedAt: now - 28 * 60 * 60_000,
      publishCount: 26,
      isDemo: true,
    },
    {
      wallet: DEMO_WALLETS[3],
      dnaHash: demoHash('blur-shadow'),
      formality: 1,
      wordCount: 6_200,
      lastPublishedAt: now - 52 * 60 * 60_000,
      publishCount: 14,
      isDemo: true,
    },
  ]
}

export function mergeLeaderboardWithDemo(
  chainRows: LeaderboardRow[],
  includeDemo: boolean
): LeaderboardRow[] {
  if (!includeDemo) return chainRows
  const demos = getLeaderboardDemoRows()
  const merged = [...chainRows, ...demos]
  merged.sort((a, b) => {
    if (b.publishCount !== a.publishCount) return b.publishCount - a.publishCount
    if (b.wordCount !== a.wordCount) return b.wordCount - a.wordCount
    return b.lastPublishedAt - a.lastPublishedAt
  })
  return merged
}
