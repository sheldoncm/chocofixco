import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'

// LEARNING NOTE: useState manages dropdown visibility.
// useRef identifies the dropdown DOM element.
// useEffect registers and cleans up browser event listeners.
// Props allow this component to serve both account types.

export default function AccountMenu({
  user, admin = false, onLogout, onSelect
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleOutside(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function close() {
    setOpen(false)
    onSelect?.()
  }

  const firstName = user.full_name?.includes('@')
    ? 'Administrator'
    : user.full_name?.trim().split(' ')[0]

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className="account-menu-trigger"
        aria-expanded={open}
        aria-controls={admin ? 'admin-account-menu' : 'customer-account-menu'}
        onClick={() => setOpen(previous => !previous)}
      >
        <svg viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.6"
          aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </svg>

        <span>{admin ? 'Administrator' : 'My Account'}</span>

        <svg className={open ? 'account-chevron expanded' : 'account-chevron'}
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8"
          aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="account-dropdown"
          id={admin ? 'admin-account-menu' : 'customer-account-menu'}>

          <div className="account-dropdown-heading">
            <strong>Welcome, {firstName || 'Customer'}</strong>
            <span>{admin ? 'Administrator account' : 'Customer account'}</span>
          </div>

          {!admin && (
            <div className="account-dropdown-links">
              <Link href="/account" onClick={close}>
                My Profile
              </Link>
              <Link href="/account/orders" onClick={close}>
                My Orders
              </Link>
              <Link href="/account/addresses" onClick={close}>
                Saved Addresses
              </Link>
              <Link href="/account/password" onClick={close}>
                Login &amp; Security
              </Link>
            </div>
          )}

          {admin && (
            <div className="account-dropdown-links">
              <Link href="/admin/account" onClick={close}>
                My Admin Account
              </Link>
            </div>
          )}

          <div className="account-dropdown-footer">
            <button type="button" onClick={() => {
              close()
              onLogout()
            }}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
