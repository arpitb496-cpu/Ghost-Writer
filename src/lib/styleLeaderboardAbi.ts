export const styleLeaderboardAbi = [
  {
    type: 'function',
    name: 'publish',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dnaHash', type: 'bytes32' },
      { name: 'formality', type: 'uint8' },
      { name: 'wordCount', type: 'uint32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'participantCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'participantAt',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'entries',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'dnaHash', type: 'bytes32' },
      { name: 'formality', type: 'uint8' },
      { name: 'wordCount', type: 'uint32' },
      { name: 'lastPublishedAt', type: 'uint64' },
      { name: 'publishCount', type: 'uint32' },
    ],
  },
] as const
