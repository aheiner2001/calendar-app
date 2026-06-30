import { Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import AppBar from './components/AppBar.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import BottomNav from './components/BottomNav.jsx'
import Toast from './components/Toast.jsx'
import Home from './pages/Home.jsx'
import Calendar from './pages/Calendar.jsx'
import Sync from './pages/Sync.jsx'

export default function App() {
  const { firebaseEnabled, authLoading, user } = useApp()

  if (firebaseEnabled && authLoading) {
    return <div className="auth-screen"><p className="auth-loading">Loading…</p></div>
  }

  if (firebaseEnabled && !user) {
    return <AuthScreen />
  }

  return (
    <div className="app-shell">
      <AppBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/sync" element={<Sync />} />
        </Routes>
      </main>
      <Toast />
      <BottomNav />
    </div>
  )
}
