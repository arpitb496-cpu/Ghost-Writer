/**
 * FileDropZone.tsx
 *
 * Drag-and-drop zone for loading writing samples.
 *
 * Key privacy point: files are read using FileReader/pdfjs
 * ENTIRELY in the browser. They never touch a server.
 * We make this explicit in the UI copy.
 */

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import styles from './FileDropZone.module.css'

interface Props {
  onFilesLoaded: (files: File[]) => void
  isProcessing: boolean
  existingCount: number
}

export function FileDropZone({ onFilesLoaded, isProcessing, existingCount }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files).filter(isValidFile)
      if (files.length > 0) onFilesLoaded(files)
    },
    [onFilesLoaded]
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter(isValidFile)
      if (files.length > 0) onFilesLoaded(files)
      // Reset input so same file can be re-added
      e.target.value = ''
    },
    [onFilesLoaded]
  )

  return (
    <div
      className={`${styles.zone} ${isDragging ? styles.dragging : ''} ${isProcessing ? styles.processing : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
    >
      <input
        type="file"
        id="file-input"
        className={styles.hiddenInput}
        accept=".txt,.md,.pdf,.text"
        multiple
        onChange={handleChange}
        disabled={isProcessing}
      />

      {isProcessing ? (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.mainText}>Analyzing your writing...</p>
          <p className={styles.subText}>Extracting style patterns locally</p>
        </div>
      ) : (
        <label htmlFor="file-input" className={styles.content}>
          <div className={styles.iconArea}>
            {existingCount > 0 ? (
              <span className={styles.countBadge}>{existingCount}</span>
            ) : (
              <span className={styles.dropIcon}>📄</span>
            )}
          </div>

          <p className={styles.mainText}>
            {existingCount > 0
              ? `${existingCount} sample${existingCount !== 1 ? 's' : ''} loaded`
              : 'Drop your writing here'}
          </p>
          <p className={styles.subText}>
            {existingCount > 0
              ? 'Drop more files to expand your profile'
              : '.txt · .md · .pdf — emails, notes, messages'}
          </p>

          <div className={styles.privacyBadge}>
            <span className={styles.lockIcon}>🔒</span>
            <span>Never leaves your device</span>
          </div>
        </label>
      )}
    </div>
  )
}

function isValidFile(f: File): boolean {
  const ext = f.name.split('.').pop()?.toLowerCase()
  return ['txt', 'md', 'text', 'pdf'].includes(ext || '')
}
