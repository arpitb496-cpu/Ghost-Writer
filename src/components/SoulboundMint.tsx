/**
 * SoulboundMint — commit Writing DNA hash on-chain (non-transferable NFT).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  createPublicClient,
  createWalletClient,
  custom,
  type Address,
  type Hash,
} from 'viem'
import { hashWritingDNA, type WritingDNA } from '../lib/writingDNA'
import { getAppChain } from '../lib/chains'
import { writingDNASoulboundAbi } from '../lib/writingDNASoulboundAbi'
import styles from './SoulboundMint.module.css'

interface Props {
  dna: WritingDNA
  /** When true, sits inside SoulboundSection without a second full card frame */
  embedded?: boolean
}

function contractAddress(): Address | null {
  const raw = import.meta.env.VITE_WRITING_DNA_SOULBOUND_ADDRESS
  if (!raw || !raw.startsWith('0x') || raw.length !== 42) return null
  return raw as Address
}

function getEthereum() {
  return typeof window !== 'undefined' ? window.ethereum : undefined
}

export function SoulboundMint({ dna, embedded = false }: Props) {
  const addr = contractAddress()
  const chain = getAppChain()
  const [account, setAccount] = useState<Address | null>(null)
  const [tokenId, setTokenId] = useState<bigint>(0n)
  const [onChainHash, setOnChainHash] = useState<Hash | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastTx, setLastTx] = useState<Hash | null>(null)

  const localHash = hashWritingDNA(dna)

  const refresh = useCallback(async () => {
    const eth = getEthereum()
    if (!addr || !account || !eth) return
    const pc = createPublicClient({ chain, transport: custom(eth) })
    const tid = await pc.readContract({
      address: addr,
      abi: writingDNASoulboundAbi,
      functionName: 'tokenOfOwner',
      args: [account],
    })
    setTokenId(tid)
    if (tid === 0n) {
      setOnChainHash(null)
      return
    }
    const h = await pc.readContract({
      address: addr,
      abi: writingDNASoulboundAbi,
      functionName: 'dnaHashOf',
      args: [tid],
    })
    setOnChainHash(h)
  }, [addr, account, chain])

  useEffect(() => {
    if (!addr) return
    const eth = getEthereum()
    if (!eth) return
    void eth.request?.({ method: 'eth_accounts' }).then((accs) => {
      const list = accs as string[]
      if (list?.[0]) setAccount(list[0] as Address)
    })
  }, [addr])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = async () => {
    setError('')
    const eth = getEthereum()
    if (!eth) {
      setError('Install a wallet (e.g. MetaMask) to mint.')
      return
    }
    const accs = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
    if (accs[0]) setAccount(accs[0] as Address)
  }

  const mintOrUpdate = async () => {
    if (!addr) return
    const eth = getEthereum()
    if (!eth) return
    setBusy(true)
    setError('')
    setLastTx(null)
    try {
      const wallet = createWalletClient({ chain, transport: custom(eth) })
      const acct = account ?? (await wallet.getAddresses())[0]
      if (!acct) {
        setError('Connect your wallet first.')
        setBusy(false)
        return
      }

      const publicClient = createPublicClient({ chain, transport: custom(eth) })
      const isMint = tokenId === 0n

      const { request } = await publicClient.simulateContract({
        address: addr,
        abi: writingDNASoulboundAbi,
        functionName: isMint ? 'mint' : 'updateDNAHash',
        args: [localHash],
        account: acct,
      })
      const txHash = await wallet.writeContract(request)
      setLastTx(txHash)
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  const shellClass = embedded ? styles.panelEmbedded : styles.card

  if (!addr) {
    return (
      <div className={shellClass}>
        <p className={styles.hashPreview}>
          <span className={styles.hashLabel}>Local DNA commitment (preview)</span>
          <code className={styles.hashCode}>{localHash.slice(0, 10)}…{localHash.slice(-8)}</code>
        </p>
        <h3 className={embedded ? styles.titleSm : styles.title}>
          {!embedded && <span className={styles.icon}>⛓️</span>}
          Deploy contract to mint
        </h3>
        <p className={styles.muted}>
          Set <code className={styles.code}>VITE_WRITING_DNA_SOULBOUND_ADDRESS</code> in your env to the deployed
          contract, then restart the dev server. Your full profile still stays in the browser.
        </p>
      </div>
    )
  }

  const needsUpdate =
    tokenId !== 0n && onChainHash != null && onChainHash.toLowerCase() !== localHash.toLowerCase()
  const synced =
    tokenId !== 0n && onChainHash != null && onChainHash.toLowerCase() === localHash.toLowerCase()

  const explorerBase = chain.blockExplorers?.default?.url

  return (
    <div className={shellClass}>
      <p className={styles.hashPreview}>
        <span className={styles.hashLabel}>DNA hash (keccak256)</span>
        <code className={styles.hashCode}>{localHash.slice(0, 10)}…{localHash.slice(-8)}</code>
      </p>
      <h3 className={embedded ? styles.titleSm : styles.title}>
        {!embedded && <span className={styles.icon}>⛓️</span>}
        {embedded ? 'Wallet & mint' : 'Writing DNA Soulbound'}
      </h3>
      <p className={styles.desc}>
        Non-transferable NFT (EIP-5192) — only this hash is stored on-chain.
      </p>

      {!account ? (
        <button type="button" className={styles.primary} onClick={() => void connect()} disabled={busy}>
          Connect wallet
        </button>
      ) : (
        <>
          <p className={styles.walletLine}>
            <span className={styles.muted}>Connected</span>{' '}
            <code className={styles.code}>
              {account.slice(0, 6)}…{account.slice(-4)}
            </code>
          </p>

          {synced && <p className={styles.ok}>On-chain hash matches your current Writing DNA.</p>}
          {needsUpdate && (
            <p className={styles.warn}>Your DNA changed since mint — update the commitment on-chain.</p>
          )}
          {tokenId === 0n && (
            <p className={styles.muted}>You have not minted yet. One soulbound token per wallet.</p>
          )}

          <button
            type="button"
            className={styles.primary}
            onClick={() => void mintOrUpdate()}
            disabled={busy || synced}
          >
            {busy ? 'Confirm in wallet…' : tokenId === 0n ? 'Mint soulbound DNA' : needsUpdate ? 'Update on-chain hash' : 'Synced'}
          </button>

          {lastTx && (
            <p className={styles.tx}>
              Tx:{' '}
              {explorerBase ? (
                <a href={`${explorerBase}/tx/${lastTx}`} target="_blank" rel="noreferrer">
                  {lastTx.slice(0, 10)}…
                </a>
              ) : (
                <span>{lastTx.slice(0, 10)}…</span>
              )}
            </p>
          )}
          {error && <p className={styles.err}>{error}</p>}
        </>
      )}
    </div>
  )
}
