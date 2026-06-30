import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { executeAssistantResult } from '../lib/aiActions.js'
import { aiEnabled } from '../lib/firebase.js'
import { runAssistant } from '../lib/gemini.js'
import { dateKey } from '../lib/time.js'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const HINTS = [
  'Add lunch tomorrow at noon',
  'Plan study time around my baseline this week',
  'Move Friday gym to 4pm',
  'Cancel tomorrow\'s meeting',
  'I\'m sick — reschedule non-urgent stuff',
  'Review my week — when am I busiest?',
  'Summarize tomorrow',
  'Paste: Team sync Mon 10am, Lunch Tue 12pm…',
  'Add companionship Tuesday 6pm on shared calendar',
]

export default function AiAssistantModal({ onClose, onSaved }) {
  const {
    selectedDate,
    settings,
    events,
    calendars,
    activeCalendarId,
    personalCalendarId,
    addEvent,
    updateEvent,
    deleteEvent,
    writeCalendarId,
    showToast,
  } = useApp()

  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const recognitionRef = useRef(null)

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }, [])

  useEffect(() => () => stopListening(), [stopListening])

  const handleListen = () => {
    setError('')
    if (!SpeechRecognition) {
      setError('Voice not supported here — type instead.')
      return
    }
    if (listening) {
      stopListening()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognitionRef.current = recognition
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onerror = () => setError('Voice capture failed.')
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }
    setListening(true)
    recognition.start()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || busy) return

    setBusy(true)
    setError('')
    setSummary('')
    stopListening()

    try {
      const result = await runAssistant({
        text: trimmed,
        referenceDate: selectedDate,
        settings,
        events,
        calendars,
        activeCalendarId,
        personalCalendarId,
      })

      const outcomes = await executeAssistantResult(result, {
        addEvent,
        updateEvent,
        deleteEvent,
        events,
        settings,
        calendars,
        writeCalendarId,
      })

      if (result.intent === 'summarize' || result.intent === 'review') {
        setSummary(outcomes.messages[0] || result.summary)
        return
      }

      const parts = []
      if (outcomes.added) parts.push(`Added ${outcomes.added}`)
      if (outcomes.updated) parts.push(`Updated ${outcomes.updated}`)
      if (outcomes.deleted) parts.push(`Deleted ${outcomes.deleted}`)
      if (outcomes.rescheduled) parts.push(`Rescheduled ${outcomes.rescheduled}`)
      if (outcomes.messages.length) parts.push(...outcomes.messages)

      showToast(parts.join(' · ') || 'Done')
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not complete request')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ai-assistant-modal" onClick={(e) => e.stopPropagation()}>
        <h3>AI assistant</h3>
        <p className="settings-hint">
          Add, edit, reschedule, import, plan around your priority schedule, or ask for a day/week summary.
        </p>

        {!aiEnabled && (
          <div className="ai-setup-callout">
            <strong>Setup required</strong>
            <p>Enable Firebase AI Logic (Gemini Developer API) in the Firebase console.</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            className="ai-assistant-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={HINTS[0]}
            rows={4}
            autoFocus
          />
          <div className="ai-hint-chips">
            {HINTS.slice(1, 4).map((h) => (
              <button key={h} type="button" className="ai-hint-chip" onClick={() => setText(h)}>
                {h}
              </button>
            ))}
          </div>

          {summary && <div className="ai-summary-box">{summary}</div>}
          {error && <p className="ai-assistant-error">{error}</p>}

          <div className="ai-assistant-actions">
            <button type="button" className={`btn btn-ghost${listening ? ' active' : ''}`} onClick={handleListen} disabled={busy}>
              {listening ? 'Stop' : 'Voice'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {summary ? 'Close' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !text.trim() || !aiEnabled}>
              {busy ? 'Working…' : summary ? 'Ask again' : 'Go'}
            </button>
          </div>
        </form>

        <p className="settings-hint ai-assistant-footnote">
          Uses your priority baseline &amp; presets · ref {dateKey(selectedDate)}
        </p>
      </div>
    </div>
  )
}
