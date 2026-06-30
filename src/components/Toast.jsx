import { useApp } from '../context/AppContext.jsx'

export default function Toast() {
  const { toast } = useApp()
  return <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
}
