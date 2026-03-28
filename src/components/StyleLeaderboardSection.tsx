/**
 * Feature 4 — Style Leaderboard: anonymous on-chain registry (Monad).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  createPublicClient,
  createWalletClient,
  custom,
  type Address,
} from 'viem'
import { type WritingDNA } from '../lib/writingDNA'
import { getAppChain } from '../lib/chains'
import { mergeLeaderboardWithDemo } from '../lib/leaderboardDemo'
import {
  createLeaderboardPublicClient,
  fetchLeaderboard,
  formalityLabel,
  stampForPublish,
  type LeaderboardRow,
} from '../lib/styleLeaderboard'
import { styleLeaderboardAbi } from '../lib/styleLeaderboardAbi'
import styles from './StyleLeaderboardSection.module.css'

interface Props {
  dna: WritingDNA | null
}

function leaderboardAddress(): Address | null {
  const raw = import.meta.env.VITE_STYLE_LEADERBOARD_ADDRESS?.trim()
  if (!raw || !raw.startsWith('0x') || raw.length !== 42) return null
  return raw as Address
}

function includeDemoRows(): boolean {
  return import.meta.env.VITE_STYLE_LEADERBOARD_DEMO !== 'false'
}

function getEthereum() {
  return typeof window !== 'undefined' ? window.ethereum : undefined
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function formatTime(ts: number) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function StyleLeaderboardSection({ dna }: Props) {
  const addr = leaderboardAddress()
  const demoOn = includeDemoRows()
  const chain = getAppChain()
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchErr, setFetchErr] = useState('')
  const [account, setAccount] = useState<Address | null>(null)
  const [busy, setBusy] = useState(false)
  const [txErr, setTxErr] = useState('')
  const [txOk, setTxOk] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr('')
    try {
      if (!addr) {
        setRows(mergeLeaderboardWithDemo([], demoOn))
        if (!demoOn) setRows([])
        setLoading(false)
        return
      }
      const client = createLeaderboardPublicClient(chain)
      const data = await fetchLeaderboard(client, addr)
      setRows(mergeLeaderboardWithDemo(data, demoOn))
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load leaderboard')
      setRows(mergeLeaderboardWithDemo([], demoOn))
    } finally {
      setLoading(false)
    }
  }, [addr, chain, demoOn])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const eth = getEthereum()
    if (!eth?.request) return
    void eth.request({ method: 'eth_accounts' }).then((accs) => {
      const list = accs as string[]
      if (list?.[0]) setAccount(list[0] as Address)
    })
  }, [])

  const connect = async () => {
    setTxErr('')
    const eth = getEthereum()
    if (!eth) {
      setTxErr('Install a wallet (e.g. MetaMask).')
      return
    }
    const accs = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
    if (accs[0]) setAccount(accs[0] as Address)
  }

  const publish = async () => {
    if (!addr || !dna) return
    const eth = getEthereum()
    if (!eth) return
    setBusy(true)
    setTxErr('')
    setTxOk('')
    try {
      const wallet = createWalletClient({ chain, transport: custom(eth) })
      const acct = account ?? (await wallet.getAddresses())[0]
      if (!acct) {
        setTxErr('Connect your wallet first.')
        setBusy(false)
        return
      }
      const { dnaHash, formality, wordCount } = stampForPublish(dna)
      const publicClient = createPublicClient({ chain, transport: custom(eth) })
      const { request } = await publicClient.simulateContract({
        address: addr,
        abi: styleLeaderboardAbi,
        functionName: 'publish',
        args: [dnaHash, formality, wordCount],
        account: acct,
      })
      const txHash = await wallet.writeContract(request)
      setTxOk('Published — waiting for confirmation…')
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      await load()
      setTxOk('You’re on the board.')
    } catch (e) {
      setTxErr(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setBusy(false)
    }
  }

  if (!addr && !demoOn) {
    return (
      <section className={styles.shell} aria-labelledby="lb-heading">
        <h2 id="lb-heading" className={styles.title}>
          <span className={styles.icon}>🏆</span> Style Leaderboard
        </h2>
        <p className={styles.muted}>
          Deploy <code className={styles.code}>StyleLeaderboard</code>, set{' '}
          <code className={styles.code}>VITE_STYLE_LEADERBOARD_ADDRESS</code>, or enable{' '}
          <code className={styles.code}>VITE_STYLE_LEADERBOARD_DEMO=true</code> for sample rows.
        </p>
      </section>
    )
  }

  return (
    <section className={styles.shell} aria-labelledby="lb-heading">
      <div className={styles.headRow}>
        <div>
          <span className={styles.pill}>Monad · anonymous</span>
          <h2 id="lb-heading" className={styles.title}>
            <span className={styles.icon}>🏆</span> Style Leaderboard
          </h2>
          <p className={styles.lead}>
            Most active GhostWriters ranked by on-chain publish count. No names or documents — wallet, DNA hash,
            coarse style, and training word count only.
          </p>
          {!addr && demoOn && (
            <p className={styles.bannerDemo}>
              <strong>Demo preview</strong> — sample rows below. Add{' '}
              <code className={styles.code}>VITE_STYLE_LEADERBOARD_ADDRESS</code> after deploying to Monad to load
              live data.
            </p>
          )}
          {addr && demoOn && (
            <p className={styles.bannerMix}>
              Sample “GhostWriter” demo rows are mixed in for the pitch; set{' '}
              <code className={styles.code}>VITE_STYLE_LEADERBOARD_DEMO=false</code> for chain-only.
            </p>
          )}
        </div>
        <button type="button" className={styles.refresh} onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {fetchErr && <p className={styles.err}>{fetchErr}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Source</th>
              <th>Wallet</th>
              <th>Style</th>
              <th>Words trained</th>
              <th>Publishes</th>
              <th>Last publish</th>
              <th>DNA hash</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className={styles.emptyRow}>
                  No rows — enable demo or deploy the contract.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                key={`${r.wallet}-${r.isDemo ? 'demo' : 'chain'}`}
                className={r.isDemo ? styles.demoRow : undefined}
              >
                <td>{i + 1}</td>
                <td>{r.isDemo ? <span className={styles.demoBadge}>Demo</span> : <span className={styles.chainBadge}>Chain</span>}</td>
                <td>
                  <code className={styles.mono}>{shortAddr(r.wallet)}</code>
                </td>
                <td>{formalityLabel(r.formality)}</td>
                <td>{r.wordCount.toLocaleString()}</td>
                <td>
                  <span className={styles.score}>{r.publishCount}</span>
                </td>
                <td>{formatTime(r.lastPublishedAt)}</td>
                <td>
                  <code className={styles.monoSm}>
                    {r.dnaHash.slice(0, 8)}…{r.dnaHash.slice(-6)}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.publish}>
        <h3 className={styles.publishTitle}>Publish your style</h3>
        <p className={styles.publishHint}>
          Increments your on-chain activity score. Only hash + formality + aggregate word count are stored.
        </p>
        {!addr ? (
          <p className={styles.muted}>
            Set <code className={styles.code}>VITE_STYLE_LEADERBOARD_ADDRESS</code> in <code className={styles.code}>.env</code> after{' '}
            <code className={styles.code}>npm run deploy:leaderboard</code> (Monad wallet needs MON).
          </p>
        ) : !dna ? (
          <p className={styles.warn}>Train Writing DNA first.</p>
        ) : !account ? (
          <button type="button" className={styles.btn} onClick={() => void connect()} disabled={busy}>
            Connect wallet
          </button>
        ) : (
          <>
            <p className={styles.walletLine}>
              <code className={styles.mono}>{shortAddr(account)}</code>
            </p>
            <button type="button" className={styles.btn} onClick={() => void publish()} disabled={busy}>
              {busy ? 'Confirm in wallet…' : 'Publish to leaderboard'}
            </button>
          </>
        )}
        {txOk && <p className={styles.ok}>{txOk}</p>}
        {txErr && <p className={styles.errSm}>{txErr}</p>}
      </div>
    </section>
  )
}
