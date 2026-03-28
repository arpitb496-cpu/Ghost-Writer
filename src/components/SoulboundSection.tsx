/**
 * Always-visible sidebar block for Writing DNA Soulbound (Monad testnet).
 */

import type { WritingDNA } from '../lib/writingDNA'
import { SoulboundMint } from './SoulboundMint'
import styles from './SoulboundSection.module.css'

interface Props {
  dna: WritingDNA | null
}

export function SoulboundSection({ dna }: Props) {
  return (
    <section className={styles.shell} aria-labelledby="soulbound-heading">
      <div className={styles.glow} aria-hidden />
      <div className={styles.topRow}>
        <span className={styles.chainPill}>Monad testnet · 10143</span>
        <span className={styles.newPill}>On-chain</span>
      </div>
      <h2 id="soulbound-heading" className={styles.title}>
        <span className={styles.titleIcon} aria-hidden>
          ◈
        </span>
        Writing DNA Soulbound
      </h2>
      <p className={styles.lead}>
        Mint a non-transferable NFT that commits a <strong>hash</strong> of your style profile — your text never
        leaves the browser.
      </p>

      {!dna ? (
        <div className={styles.locked}>
          <div className={styles.lockedIcon} aria-hidden>
            🔐
          </div>
          <p className={styles.lockedTitle}>Unlock after DNA training</p>
          <p className={styles.lockedText}>
            Drop writing samples in <em>Your Writing DNA</em> above. Once your profile is ready, you can connect a
            wallet and mint on Monad.
          </p>
        </div>
      ) : (
        <div className={styles.mintWrap}>
          <SoulboundMint dna={dna} embedded />
        </div>
      )}
    </section>
  )
}
