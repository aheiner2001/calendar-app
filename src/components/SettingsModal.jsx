import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ALL_CALENDARS_ID } from '../lib/calendars.js'
import { useInviteQr } from '../lib/qr.js'
import {
  clampHourRowHeight,
  HOUR_ROW_HEIGHT_MAX,
  HOUR_ROW_HEIGHT_MIN,
} from '../lib/settings.js'

export default function SettingsModal({ onClose }) {
  const {
    settings,
    updateSetting,
    addColor,
    updateColor,
    deleteColor,
    activeCalendarId,
    calendars,
    ensureCalendarShareCode,
  } = useApp()
  const [share, setShare] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)

  const activeCal = calendars.find((c) => c.id === activeCalendarId)
  const isShared = activeCal?.type === 'shared'
  const qrImage = useInviteQr(share?.url ?? '')

  useEffect(() => {
    if (!isShared) {
      setShare(null)
      return
    }
    let cancelled = false
    setShareLoading(true)
    ensureCalendarShareCode(activeCalendarId)
      .then((info) => {
        if (!cancelled) setShare(info)
      })
      .finally(() => {
        if (!cancelled) setShareLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeCalendarId, isShared, ensureCalendarShareCode])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Settings</h3>

        {activeCalendarId === ALL_CALENDARS_ID && (
          <p className="settings-hint settings-share-hint">
            Select a shared calendar from the top menu to view its invite code and QR.
          </p>
        )}

        {activeCal?.type === 'personal' && (
          <p className="settings-hint settings-share-hint">
            Personal calendars are private. Switch to a shared calendar to invite others.
          </p>
        )}

        {isShared && (
          <div className="settings-share-block">
            <div className="settings-share-title">{activeCal.name}</div>
            {shareLoading && <p className="settings-hint">Loading share code…</p>}
            {!shareLoading && share && (
              <>
                <div className="sync-invite-code">{share.code}</div>
                <p className="settings-hint">Others can enter this code on Share, or scan the QR below.</p>
                {qrImage && <img src={qrImage} alt="Calendar invite QR" className="sync-qr" />}
                <input
                  type="text"
                  readOnly
                  value={share.url}
                  className="sync-copy-field"
                  onFocus={(e) => e.target.select()}
                />
              </>
            )}
          </div>
        )}

        <h4 className="settings-section-title">Calendar height</h4>
        <p className="settings-hint">
          Hour row size in day and week view. Compact fits more of your schedule on screen; expanded
          makes events easier to read and drag.
        </p>
        <div className="settings-range-row">
          <span className="settings-range-end">Compact</span>
          <input
            type="range"
            className="settings-range"
            min={HOUR_ROW_HEIGHT_MIN}
            max={HOUR_ROW_HEIGHT_MAX}
            step={4}
            value={settings.hourRowHeight}
            onChange={(e) => updateSetting('hourRowHeight', clampHourRowHeight(e.target.value))}
            aria-label="Calendar hour row height"
          />
          <span className="settings-range-end">Expanded</span>
        </div>
        <p className="settings-range-value">{settings.hourRowHeight}px per hour</p>

        <h4 className="settings-section-title">Quick add presets</h4>
        <p className="settings-hint">
          Saved activities for one-tap event creation. Each preset sets a title and color in the New
          event screen.
        </p>

        {settings.savedColors.map((c) => (
          <div className="color-row" key={c.id}>
            <input
              type="color"
              value={c.color}
              onChange={(e) => updateColor(c.id, { color: e.target.value })}
              aria-label={`${c.label} color`}
            />
            <input
              type="text"
              value={c.label}
              onChange={(e) => updateColor(c.id, { label: e.target.value })}
              placeholder="Label"
            />
            <button className="del" onClick={() => deleteColor(c.id)} aria-label="Delete color">
              ×
            </button>
          </div>
        ))}

        <button className="add-color-btn" onClick={addColor}>
          + Add preset
        </button>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
