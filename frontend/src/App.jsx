import { Route, Switch, Link } from 'wouter'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Backend from './pages/Backend'
import ManageProducts from './pages/ManageProducts'
import Checkout from './pages/Checkout'
import Confirmation from './pages/Confirmation'
import ManageOrders from './pages/ManageOrders'
import OrderDetail from './pages/OrderDetail'

// FF04 / LO5: SPA routing with static and dynamic URL parameters.
// All customer and management pages now use React.

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/backend" component={Backend} />
          <Route path="/manage/products" component={ManageProducts} />
          <Route path="/order/confirmation/:id"
            component={Confirmation} />
          <Route path="/order/:id">
            {params => <Checkout key={params.id} params={params} />}
          </Route>
          <Route path="/manage/orders" component={ManageOrders} />
          <Route path="/manage/orders/:id">
            {params => <OrderDetail key={params.id} params={params} />}
          </Route>
          <Route>
            <section className="management-page">
              <h1>Page not found</h1>
              <Link href="/">Return to shop</Link>
            </section>
          </Route>
        </Switch>
      </main>
      <Footer />
    </>
  )
}
