import { Link } from 'wouter'
import { useState } from 'react'

// FF01: React state and event handling.
// LO2: Demonstrate useState and event handlers.
//
// Unlike direct DOM manipulation, changing state causes
// React to re-render the relevant interface automatically.

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

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
          <Link
            href="/backend"
            className="backend-nav-link"
            onClick={closeMenu}
          >
            Backend
          </Link>
        </div>
      </nav>
    </header>
  )
}
