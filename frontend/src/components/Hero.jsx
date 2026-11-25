// FF01: JSX AND COMPONENTS
//
// JSX allows HTML-like syntax inside JavaScript.
// React uses className instead of the HTML class attribute.
// Images and other empty elements must be self-closing.

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-content">
        <p className="eyebrow">HANDMADE CHOCOLATE TREATS</p>

        <h1>
          A little chocolate.<br />
          A lot of happiness.
        </h1>

        <p className="hero-copy">
          Discover our handcrafted chocolates,
          made for every occasion.
        </p>

        <a className="primary-button" href="#chocolates">
          Explore Chocolates
        </a>
      </div>

      <div className="hero-visual">
        <img
          src="/images/chocofixco-products/03_hero.jpg"
          alt="ChocoFixCo handmade chocolate selection"
        />
      </div>
    </section>
  )
}
