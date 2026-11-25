// FF01: ROOT COMPONENT
// LO1: Explain how React implements reactivity.
// LO3: Demonstrate creating components.
//
// App combines reusable components into the application.
// React manages rendering instead of manually manipulating
// HTML elements through document.querySelector.

import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import './App.css'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Home />
      </main>
      <Footer />
    </>
  )
}
