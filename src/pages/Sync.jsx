import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useInviteQr, useQrScanner } from '../lib/qr.js'
import { TrashIcon } from '../components/icons.jsx'

export default function Sync() {
  const {
    firebaseEnabled,
    calendars,
    activeCalendarId,
    setActiveCalendarId,
    user,
    signOut,
    showToast,
    createSharedCalendar,
    deleteCalendar,
    joinByInviteCode,
    ensureCalendarShareCode,
    signInWithGoogle,
  } = useApp()

  const [searchParams, setSearchParams] = useSearchParams()
  const [sharedName, setSharedName] = useState('')
  const [joinCode, setJoinCode] = useState(searchParams.get('join') || '')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [share, setShare] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)

  const activeCal = calendars.find((c) => c.id === activeCalendarId)
  const isSharedActive = activeCal?.type === 'shared'
  const shareQrImage = useInviteQr(share?.url ?? '')

  const handleScannedCode = useCallback(
    async (code) => {
      setScanning(false)
      setJoinCode(code)
      setBusy(true)
      try {
        const name = await joinByInviteCode(code)
        showToast(`Joined "${name}"`)
        setSearchParams({})
      } catch (err) {
        showToast(err.message || 'Could not join')
      } finally {
        setBusy(false)
      }
    },
    [joinByInviteCode, showToast, setSearchParams],
  )

  const scanError = useQrScanner(handleScannedCode, scanning)

  useEffect(() => {
    const code = searchParams.get('join')
    if (!code || !user || busy) return
    setJoinCode(code)
    handleScannedCode(code)
  }, [searchParams, user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSharedActive) {
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
  }, [activeCalendarId, isSharedActive, ensureCalendarShareCode])

  const handleCreateShared = async () => {
    setBusy(true)
    try {
      const cal = await createSharedCalendar(sharedName)
      setSharedName('')
      setActiveCalendarId(cal.id)
      showToast(`Created "${cal.name}"`)
    } catch (err) {
      showToast(err.message || 'Could not create calendar')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setBusy(true)
    try {
      const name = await joinByInviteCode(joinCode)
      showToast(`Joined "${name}"`)
      setJoinCode('')
      setSearchParams({})
    } catch (err) {
      showToast(err.message || 'Invalid invite')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveCalendar = async (cal) => {
    const isOwner = cal.ownerId === (user?.uid ?? 'local')
    const action = isOwner ? 'delete' : 'leave'
    const msg = isOwner
      ? `Delete "${cal.name}"? All events on this calendar will be removed for everyone.`
      : `Leave "${cal.name}"? You can rejoin with an invite code.`
    if (!window.confirm(msg)) return

    setBusy(true)
    try {
      await deleteCalendar(cal.id)
      showToast(isOwner ? `Deleted "${cal.name}"` : `Left "${cal.name}"`)
    } catch (err) {
      showToast(err.message || `Could not ${action} calendar`)
    } finally {
      setBusy(false)
    }
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="page">
      <div className="share-page">
        {firebaseEnabled && user && (
          <div className="share-profile">
            <div className="share-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="share-profile-info">
              <div className="share-profile-name">{user.displayName || 'Signed in'}</div>
              <div className="share-profile-email">{user.email}</div>
            </div>
            <button type="button" className="btn btn-ghost share-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}

        {!firebaseEnabled && (
          <div className="sync-callout">
            Cloud sync is not configured. Add Firebase keys to enable shared calendars and invites.
          </div>
        )}

        {firebaseEnabled && !user && (
          <div className="sync-callout">
            <p>Sign in to create shared calendars and link with others.</p>
            <button type="button" className="btn btn-primary" onClick={signInWithGoogle}>
              Sign in with Google
            </button>
          </div>
        )}

        {firebaseEnabled && user && (
          <p className="settings-hint share-sync-hint">
            Signed in as {user.email}. Calendars and events sync through your Google account — use the
            same sign-in on every device.
          </p>
        )}

        {(firebaseEnabled && user) || !firebaseEnabled ? (
          <>
            <div className="home-section-title">My calendars</div>
            {calendars.length === 0 ? (
              <p className="share-empty">No calendars yet — create one below.</p>
            ) : (
              calendars.map((c) => {
                const isOwner = c.ownerId === (user?.uid ?? 'local')
                const canRemove = c.type !== 'personal'
                return (
                  <div
                    key={c.id}
                    className={`share-calendar-item${c.id === activeCalendarId ? ' active' : ''}`}
                  >
                    <button
                      type="button"
                      className="share-calendar-main"
                      onClick={() => setActiveCalendarId(c.id)}
                    >
                      <div className="name">{c.name}</div>
                      <div className="time">
                        {c.type === 'personal' ? 'Personal' : isOwner ? 'Shared · yours' : 'Shared · joined'}
                      </div>
                    </button>
                    {canRemove && (
                      <button
                        type="button"
                        className="share-calendar-remove"
                        onClick={() => handleRemoveCalendar(c)}
                        disabled={busy}
                        aria-label={isOwner ? `Delete ${c.name}` : `Leave ${c.name}`}
                        title={isOwner ? 'Delete calendar' : 'Leave calendar'}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                )
              })
            )}

            {isSharedActive && (
              <>
                <div className="home-section-title">Share {activeCal.name}</div>
                {shareLoading && <p className="share-empty">Loading share code…</p>}
                {!shareLoading && share && (
                  <div className="sync-invite-card">
                    <div className="sync-invite-code">{share.code}</div>
                    <p className="settings-hint">Share this code or scan the QR for others to join.</p>
                    {shareQrImage && <img src={shareQrImage} alt="Calendar invite QR" className="sync-qr" />}
                    <input
                      type="text"
                      readOnly
                      value={share.url}
                      className="sync-copy-field"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                )}
              </>
            )}

            <div className="home-section-title">Create shared calendar</div>
            <div className="sync-form-row">
              <input
                type="text"
                value={sharedName}
                onChange={(e) => setSharedName(e.target.value)}
                placeholder="e.g. Companionship"
              />
              <button type="button" className="btn btn-primary" onClick={handleCreateShared} disabled={busy}>
                Create
              </button>
            </div>

            <div className="home-section-title">Join a calendar</div>
            <div className="sync-form-row">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Invite code"
                autoCapitalize="characters"
              />
              <button type="button" className="btn btn-primary" onClick={handleJoin} disabled={busy || !joinCode}>
                Join
              </button>
            </div>
            <button type="button" className="btn btn-ghost sync-full-btn" onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Stop scanner' : 'Scan QR code'}
            </button>
            {scanning && (
              <div className="sync-scanner-wrap">
                <div id="qr-reader" />
                {scanError && <p className="sync-scanner-error">{scanError}</p>}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
