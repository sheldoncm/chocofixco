// FF01: COMPONENTS AND JSX
// LO3: Demonstrate creating components in React.
//
// A component is a reusable function that returns JSX.
// Component names must begin with a capital letter.

export default function Header() {
  return (
    <header className="site-header">
      <nav className="nav-container" aria-label="Main navigation">
        <a href="#home">
          <img
            className="brand-logo"
            src="/images/chocofixco-products/01_logo.png"
            alt="ChocoFixCo"
          />
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#chocolates">Shop Chocolates</a>
        </div>
      </nav>
    </header>
  )
}
