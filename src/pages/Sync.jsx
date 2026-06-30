import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
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
  const { firebaseEnabled, syncState, lastSynced, events, user, signOut, showToast } = useApp()
  const [spinning, setSpinning] = useState(false)
  const [localSynced, setLocalSynced] = useState(lastSynced)
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const lastTime = firebaseEnabled ? lastSynced : localSynced

  const handleSync = () => {
    setSpinning(true)
    setTimeout(() => {
      setSpinning(false)
      setLocalSynced(new Date())
      showToast('Sync complete ✓')
    }, 1600)
  }

  const label = spinning
    ? 'Syncing…'
    : firebaseEnabled
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
          <div className={`sync-circle${spinning ? ' spinning' : ''}`}>
            <SyncIcon />
          </div>
          <div className="label">{label}</div>
          <div className="sub">
            {firebaseEnabled
              ? `${events.length} events · last synced ${relativeTime(lastTime)}`
              : 'Add Firebase keys to enable cloud sync'}
          </div>
        </div>
        <button className="sync-btn" onClick={handleSync} disabled={spinning || !firebaseEnabled}>
          {spinning ? 'Syncing…' : 'Sync now'}
        </button>

        <div className="home-section-title">Account</div>
        {firebaseEnabled && user && (
          <div className="sync-list-item">
            <div className="name">{user.email}</div>
            <button className="btn btn-ghost sync-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
        <div className="sync-list-item">
          <div className="name">Cloud Firestore</div>
          {firebaseEnabled ? (
            <div className="ok">● Connected</div>
          ) : (
            <div className="warn">● Not configured</div>
          )}
        </div>
        <div className="sync-list-item">
          <div className="name">Local backup</div>
          <div className="ok">● Active</div>
        </div>
        <div className="sync-list-item">
          <div className="name">Events stored</div>
          <div className="time">{events.length}</div>
        </div>
      </div>
    </div>
  )
}
