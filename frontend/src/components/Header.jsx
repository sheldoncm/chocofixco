import AccountMenu from './AccountMenu'
import { Link, useLocation } from 'wouter'
import { useState } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import axios from 'axios'
import { userAtom, flashAtom } from '../state/auth'
import { confirmationAtom } from '../state/orders'

// FF01: React state and event handling.
// LO2: Demonstrate useState and event handlers.
//
// Unlike direct DOM manipulation, changing state causes
// React to re-render the relevant interface automatically.

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  // LEARNING NOTE: SHARED STATE AND CONDITIONAL RENDERING
  // The navigation changes according to the user's role.
  const [user, setUser] = useAtom(userAtom)
  const setFlash = useSetAtom(flashAtom)
  const setConfirmation = useSetAtom(confirmationAtom)
  const [, navigate] = useLocation()

  async function logout() {
    try {
      await axios.post('/api/auth/logout')
      setUser(null)
      setConfirmation(null)
      closeMenu()
      setFlash({
        type: 'success',
        message: 'You have signed out.'
      })
      navigate('/')
    } catch {
      setFlash({
        type: 'danger',
        message: 'Unable to sign out. Please try again.'
      })
    }
  }


  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="site-header">
      <nav className="nav-container" aria-label="Main navigation">
        <Link className="brand" href="/" aria-label="ChocoFixCo home">
          <img
            src="/images/chocofixco-products/01_logo.png"
            alt="ChocoFixCo"
          />
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-controls="nav-links"
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(previous => !previous)}
        >
          ☰
        </button>

        <div
          id="nav-links"
          className={`nav-links ${menuOpen ? 'open' : ''}`}
        >
          <Link href="/" onClick={closeMenu}>Home</Link>
          <a href="/#collection" onClick={closeMenu}>Our Chocolates</a>
          <a href="/#our-story" onClick={closeMenu}>Our Story</a>
          {user === null && (
            <>
              <Link href="/login" onClick={closeMenu}>
                Sign In
              </Link>
              <Link href="/register" onClick={closeMenu}>
                Register
              </Link>
            </>
          )}

          {user?.role === 'customer' && (
            <AccountMenu
              user={user}
              onLogout={logout}
              onSelect={closeMenu}
            />
          )}
        </div>
      </nav>
    </header>
  )
}
