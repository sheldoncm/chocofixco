import AccountMenu from './AccountMenu'
import { Link, useLocation } from 'wouter'
import { useState } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import axios from 'axios'
import { adminAtom, flashAtom } from '../state/auth'

// LEARNING NOTE: useState and event handlers control
// the responsive navigation menu and conditional rendering.

export default function AdminHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [admin, setAdmin] = useAtom(adminAtom)
  const setFlash = useSetAtom(flashAtom)
  const [, navigate] = useLocation()

  function closeMenu() {
    setMenuOpen(false)
  }

  async function logout() {
    try {
      await axios.post('/api/admin/auth/logout')
      setAdmin(null)
      closeMenu()
      setFlash({
        type: 'success',
        message: 'Administrator signed out.'
      })
      navigate('/admin/login')
    } catch {
      setFlash({
        type: 'danger',
        message: 'Unable to sign out.'
      })
    }
  }

  return (
    <header className="site-header">
      <nav className="nav-container admin-navigation"
        aria-label="Administration navigation">
        <div className="admin-brand-group">
          <Link className="brand" href="/backend">
            <img
              src="/images/chocofixco-products/01_logo.png"
              alt="ChocoFixCo"
            />
          </Link>

          <span className="admin-portal-label">Admin Portal</span>
        </div>

        {admin && (
          <>
            <button
              className="menu-toggle"
              type="button"
              aria-controls="admin-nav-links"
              aria-expanded={menuOpen}
              aria-label="Toggle administration menu"
              onClick={() => setMenuOpen(previous => !previous)}
            >
              ☰
            </button>

            <div id="admin-nav-links"
              className={`nav-links ${menuOpen ? 'open' : ''}`}>
              <Link href="/backend" onClick={closeMenu}>
                Dashboard
              </Link>
              <Link href="/manage/products" onClick={closeMenu}>
                Products
              </Link>
              <Link href="/manage/orders" onClick={closeMenu}>
                Orders
              </Link>
              <Link href="/manage/users" onClick={closeMenu}>
                Users
              </Link>
              <Link href="/" onClick={closeMenu}>
                View Store
              </Link>
              <AccountMenu
                user={admin}
                admin={true}
                onLogout={logout}
                onSelect={closeMenu}
              />
            </div>
          </>
        )}
      </nav>
    </header>
  )
}
