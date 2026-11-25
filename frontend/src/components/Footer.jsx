// FF01: Reusable component and JSX expressions.
// Curly braces evaluate JavaScript inside JSX.

export default function Footer() {
  return (
<footer className="site-footer">
        <div className="footer-container">
            <div className="footer-brand">
                <img
                    src="/images/chocofixco-products/02_logo-round.png"
                    alt="ChocoFixCo logo" />

                <div>
                    <strong>ChocoFixCo</strong>
                    <p>Made for life's sweeter moments.</p>
                </div>
            </div>

            <div className="footer-links">
                <a href="/">Home</a>
                <a href="/#collection">Chocolates</a>

            </div>
        </div>

        <p className="footer-copyright">
            © {new Date().getFullYear()} ChocoFixCo
        </p>
    </footer>
  )
}
