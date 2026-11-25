// FF01: REUSABLE COMPONENTS
//
// The Footer can be reused across multiple pages.
// Curly braces evaluate JavaScript expressions inside JSX.

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>A little chocolate. A lot of happiness.</p>
      <small>
        &copy; {new Date().getFullYear()} ChocoFixCo.
        All rights reserved.
      </small>
    </footer>
  )
}
