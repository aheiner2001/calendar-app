import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useInviteQr, useQrScanner } from '../lib/qr.js'
import { SyncIcon } from '../components/icons.jsx'

function relativeTime(date) {
  if (!date) return 'never'
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
}

export default function Sync() {
  const {
    firebaseEnabled,
    syncState,
    lastSynced,
    allEvents,
    calendars,
    user,
    signOut,
    showToast,
    createSharedCalendar,
    createInvite,
    joinByInviteCode,
    signInWithGoogle,
  } = useApp()

  const [searchParams, setSearchParams] = useSearchParams()
  const [sharedName, setSharedName] = useState('')
  const [shareCalendarId, setShareCalendarId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invite, setInvite] = useState(null)
  const [joinCode, setJoinCode] = useState(searchParams.get('join') || '')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)

  const sharedCalendars = calendars.filter((c) => c.type === 'shared')
  const qrUrl = invite?.url ?? ''
  const qrImage = useInviteQr(qrUrl)

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
    if (!shareCalendarId && sharedCalendars[0]) {
      setShareCalendarId(sharedCalendars[0].id)
    }
  }, [sharedCalendars, shareCalendarId])

  const handleCreateShared = async () => {
    setBusy(true)
    try {
      const cal = await createSharedCalendar(sharedName)
      setSharedName('')
      setShareCalendarId(cal.id)
      showToast(`Created "${cal.name}"`)
    } catch {
      showToast('Could not create calendar')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!shareCalendarId) return
    setBusy(true)
    try {
      const inv = await createInvite(shareCalendarId, inviteEmail)
      setInvite(inv)
      showToast(inviteEmail ? 'Invite created for email' : 'Invite link ready')
    } catch (err) {
      showToast(err.message || 'Could not create invite')
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

  const label = firebaseEnabled
    ? syncState === 'synced'
      ? 'Up to date'
      : syncState === 'error'
        ? 'Connection error'
        : syncState === 'offline'
          ? 'Sign in required'
          : 'Connecting…'
    : 'Local only'

  return (
    <div className="page">
      <div className="sync-page">
        <div className="sync-status">
          <div className="sync-circle">
            <SyncIcon />
          </div>
          <div className="label">{label}</div>
          <div className="sub">
            {firebaseEnabled
              ? `${allEvents.length} events · last synced ${relativeTime(lastSynced)}`
              : 'Sign in to link calendars with others'}
          </div>
        </div>

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

        {(firebaseEnabled && user) || !firebaseEnabled ? (
          <>
            <div className="home-section-title">Your calendars</div>
            {calendars.map((c) => (
              <div key={c.id} className="sync-list-item">
                <div className="name">{c.name}</div>
                <div className="time">{c.type === 'personal' ? 'Personal' : 'Shared'}</div>
              </div>
            ))}

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

            {sharedCalendars.length > 0 && (
              <>
                <div className="home-section-title">Invite someone</div>
                <label className="sync-field-label">Calendar</label>
                <select value={shareCalendarId} onChange={(e) => setShareCalendarId(e.target.value)}>
                  {sharedCalendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <label className="sync-field-label">Email (optional)</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@email.com — auto-joins when they sign in"
                />
                <button type="button" className="btn btn-primary sync-full-btn" onClick={handleCreateInvite} disabled={busy}>
                  Generate invite link & QR
                </button>

                {invite && (
                  <div className="sync-invite-card">
                    <div className="sync-invite-code">{invite.code}</div>
                    <p className="settings-hint">Share this code or scan the QR. Expires in 7 days.</p>
                    {qrImage && <img src={qrImage} alt="Invite QR code" className="sync-qr" />}
                    <input type="text" readOnly value={invite.url} className="sync-copy-field" onFocus={(e) => e.target.select()} />
                  </div>
                )}
              </>
            )}

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

        <div className="home-section-title">Account</div>
        {firebaseEnabled && user && (
          <div className="sync-list-item">
            <div className="name">{user.email}</div>
            <button type="button" className="btn btn-ghost sync-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
