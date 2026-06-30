import { NavLink } from 'react-router-dom'
import { CalendarIcon, HomeIcon, PeopleIcon } from './icons.jsx'

const ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/sync', label: 'Share', Icon: PeopleIcon },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
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
    </nav>
  )
}
