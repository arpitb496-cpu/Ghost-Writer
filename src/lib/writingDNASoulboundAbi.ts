/** Minimal ABI for WritingDNASoulbound — mint / read / update hash. */
export const writingDNASoulboundAbi = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dnaHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateDNAHash',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'tokenOfOwner',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'dnaHashOf',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ type: 'bytes32' }],
  },
] as const
