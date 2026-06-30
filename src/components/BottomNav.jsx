import { NavLink } from 'react-router-dom'
import { CalendarIcon, HomeIcon, SyncIcon } from './icons.jsx'

const ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/sync', label: 'Sync', Icon: SyncIcon },
]

export default function BottomNav() {
  return (
    <div className="bottom-nav">
      {ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </div>
  )
}
