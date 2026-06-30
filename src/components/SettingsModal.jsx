import { useApp } from '../context/AppContext.jsx'

export default function SettingsModal({ onClose }) {
  const { settings, addColor, updateColor, deleteColor } = useApp()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Saved colors</h3>
        <p className="settings-hint">
          These are your quick-add activities. Tap the swatch to recolor, rename the label, or
          remove ones you don't use. They appear in the New event screen.
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
          + Add color
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
