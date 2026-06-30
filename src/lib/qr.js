import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import QRCode from 'qrcode'

export function useInviteQr(url) {
  const [dataUrl, setDataUrl] = useState('')
  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setDataUrl).catch(() => setDataUrl(''))
  }, [url])
  return dataUrl
}

export function useQrScanner(onCode, active) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return

    const id = 'qr-reader'
    const scanner = new Html5Qrcode(id)
    scannerRef.current = scanner
    let cancelled = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (text) => {
          const match = text.match(/join=([A-Z0-9]+)/i) || text.match(/^([A-Z0-9]{6,10})$/)
          const code = match?.[1]?.toUpperCase()
          if (code) onCode(code)
        },
        () => {},
      )
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Camera unavailable')
      })

    return () => {
      cancelled = true
      scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}))
      scannerRef.current = null
    }
  }, [active, onCode])

  return error
}
