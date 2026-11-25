// FF01: JSX and reusable React components.
// LO3: Component composition.
// Original Module 8 design retained during migration.

export default function Story() {
  return (
<section id="our-story" className="boutique-story">

        <div className="boutique-story-image">
            <img
                src="/images/chocofixco-new/choc_bar.jpeg"
                alt="Chocolate bar presented with beautiful toppings"
                loading="lazy" />
        </div>

        <div className="boutique-story-content">
            <p className="boutique-label">SWEET MOMENTS</p>

            <h2>
                More than chocolate.<br />
                <em>A little happiness.</em>
            </h2>

            <p>
                Whether it's a gift for someone special,
                a treat for yourself or a celebration
                worth remembering, chocolate has a way
                of making the moment sweeter.
            </p>

            <a href="#collection" className="boutique-text-link">
                Discover the collection
                <span aria-hidden="true">↗</span>
            </a>
        </div>

    </section>
  )
}
