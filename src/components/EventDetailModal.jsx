import { EditIcon, RepeatIcon } from './icons.jsx'

export default function EventDetailModal({ event, onClose, onEdit }) {
  const notes = event.notes?.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal event-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-detail-header">
          <h3>
            {event.title}
            {event.repeat && <RepeatIcon className="repeat-icon" />}
          </h3>
          <button type="button" className="event-detail-edit" onClick={onEdit} aria-label="Edit event">
            <EditIcon />
          </button>
        </div>

        {notes ? (
          <div className="event-detail-notes">{notes}</div>
        ) : (
          <div className="event-detail-empty">No notes</div>
        )}

        <button type="button" className="btn btn-ghost event-detail-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
