// FF01: JSX and reusable React components.
// LO3: Component composition.
// Original Module 8 design retained during migration.

export default function Hero() {
  return (
<section className="boutique-hero">

        <div className="boutique-hero-copy">
            <div className="boutique-kicker">
                <span className="kicker-line"></span>
                CHOCOFIXCO COLLECTION
            </div>

            <h1>
                Little bites.<br />
                <em>Beautiful moments.</em>
            </h1>

            <p>
                Thoughtfully made chocolate treats for
                sharing, celebrating and gifting.
            </p>

            <div className="boutique-hero-actions">
                <a href="#collection" className="boutique-button">
                    Explore Our Chocolates
                    <span aria-hidden="true">↗</span>
                </a>
            </div>

            <div className="boutique-hero-footnote">
                A LITTLE INDULGENCE, A LOT OF JOY
            </div>
        </div>

        <div className="boutique-hero-photo">
            <img
                src="/images/chocofixco-new/Choc1.3.jpeg"
                alt="Beautifully presented ChocoFixCo chocolates" />


        </div>

    </section>
  )
}
