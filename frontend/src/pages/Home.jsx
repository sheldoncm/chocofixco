// FF01: COMPONENT COMPOSITION
//
// Larger interfaces are built by combining smaller components.
// A JSX Fragment groups elements without adding a DOM container.

import Hero from '../components/Hero'

export default function Home() {
  return (
    <>
      <Hero />

      <section id="chocolates" className="content-section">
        <p className="eyebrow">OUR COLLECTION</p>
        <h2>Choose your chocolate</h2>
        <p>Discover your next chocolate favourite.</p>

        {/* Product catalogue will be implemented in FF02. */}
      </section>
    </>
  )
}
