// FF01: JSX and reusable React components.
// LO3: Component composition.
// Original Module 8 design retained during migration.

export default function Gallery() {
  return (
<section className="boutique-gallery-section">

        <div className="boutique-gallery-heading">
            <p className="boutique-label">A CLOSER LOOK</p>
            <h2>Made to <em>tempt.</em></h2>
        </div>

        <div className="boutique-gallery-grid">

            <img
                src="/images/chocofixco-new/chco_square.jpeg"
                alt="Artisan chocolate assortment"
                loading="lazy" />

            <img
                src="/images/chocofixco-new/choc_doughnut.jpeg"
                alt="Chocolate doughnut with toppings"
                loading="lazy" />

            <img
                src="/images/chocofixco-new/Choc1.2.jpeg"
                alt="Chocolate gift presentation"
                loading="lazy" />

            <img
                src="/images/chocofixco-new/Choc1.5.jpeg"
                alt="ChocoFixCo chocolate selection"
                loading="lazy" />

        </div>

    </section>
  )
}
