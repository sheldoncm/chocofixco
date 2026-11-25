import Hero from '../components/Hero'
import Collection from '../components/Collection'
import Story from '../components/Story'
import Gallery from '../components/Gallery'

// FF01: Component composition.
// LO3: Build an interface using reusable components.

export default function Home() {
  return (
    <div className="boutique-storefront">
      <Hero />
      <Collection />
      <Story />
      <Gallery />
    </div>
  )
}
