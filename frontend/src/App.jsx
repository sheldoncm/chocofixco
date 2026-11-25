import { Route, Switch, Link, useLocation, Redirect } from 'wouter'
import { useAtomValue } from 'jotai'
import { adminAtom } from './state/auth'
import Header from './components/Header'
import AdminHeader from './components/AdminHeader'
import Footer from './components/Footer'
import Home from './pages/Home'
import Backend from './pages/Backend'
import ManageProducts from './pages/ManageProducts'
import ManageUsers from './pages/ManageUsers'
import Checkout from './pages/Checkout'
import Confirmation from './pages/Confirmation'
import ManageOrders from './pages/ManageOrders'
import OrderDetail from './pages/OrderDetail'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import AdminSecurity from './pages/AdminSecurity'
import Register from './pages/Register'
import Account from './pages/Account'
import SavedAddresses from './pages/SavedAddresses'
import CustomerOrders from './pages/CustomerOrders'
import CustomerOrderDetail from './pages/CustomerOrderDetail'
import ChangePassword from './pages/ChangePassword'
import LoginSecurity from './pages/LoginSecurity'

import AuthSession from './components/AuthSession'
import FlashMessage from './components/FlashMessage'
import ProtectedRoute from './components/ProtectedRoute'


// FF04 / LO5: SPA routing with static and dynamic URL parameters.
// All customer and management pages now use React.

export default function App() {
  const [location] = useLocation()
  const admin = useAtomValue(adminAtom)

  const isAdminPage =
    location === '/backend' ||
    location === '/admin' ||
    location.startsWith('/admin/') ||
    location.startsWith('/manage/')
  return (
    <>
      <AuthSession />
      {isAdminPage ? <AdminHeader /> : <Header />}
      <FlashMessage />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          {/* Admin entry point: route according to session state. */}
          <Route path="/admin">
            {admin === undefined
              ? <div className="container py-5">Checking your session...</div>
              : <Redirect to={admin ? '/backend' : '/admin/login'} />}
          </Route>

          <Route path="/admin/login">
            {admin === undefined
              ? <div className="container py-5">Checking your session...</div>
              : admin
                ? <Redirect to="/backend" />
                : <AdminLogin />}
          </Route>
          <Route path="/account/orders/:id">
            {params => (
              <ProtectedRoute role="customer">
                <CustomerOrderDetail key={params.id} params={params} />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/account/orders">
            <ProtectedRoute role="customer">
              <CustomerOrders />
            </ProtectedRoute>
          </Route>

          <Route path="/account/password">
            <ProtectedRoute role="customer">
              <LoginSecurity />
            </ProtectedRoute>
          </Route>

          <Route path="/account/change-password">
            <ProtectedRoute role="customer">
              <ChangePassword />
            </ProtectedRoute>
          </Route>

          <Route path="/account/addresses">
            <ProtectedRoute role="customer">
              <SavedAddresses />
            </ProtectedRoute>
          </Route>

          <Route path="/account">
            <ProtectedRoute role="customer">
              <Account />
            </ProtectedRoute>
          </Route>

          <Route path="/admin/account">
            <ProtectedRoute role="admin">
              <AdminSecurity />
            </ProtectedRoute>
          </Route>
          <Route path="/backend">
            <ProtectedRoute role="admin">
              <Backend />
            </ProtectedRoute>
          </Route>
          <Route path="/manage/users">
            <ProtectedRoute role="admin">
              <ManageUsers />
            </ProtectedRoute>
          </Route>
          <Route path="/manage/products">
            <ProtectedRoute role="admin">
              <ManageProducts />
            </ProtectedRoute>
          </Route>
          <Route path="/order/confirmation/:id"
            component={Confirmation} />
          <Route path="/order/:id">
            {params => <Checkout key={params.id} params={params} />}
          </Route>
          <Route path="/manage/orders">
            <ProtectedRoute role="admin">
              <ManageOrders />
            </ProtectedRoute>
          </Route>
          <Route path="/manage/orders/:id">
            {params => (
              <ProtectedRoute role="admin">
                <OrderDetail key={params.id} params={params} />
              </ProtectedRoute>
            )}
          </Route>
          <Route>
            <section className="management-page">
              <h1>Page not found</h1>
              <Link href="/">Return to shop</Link>
            </section>
          </Route>
        </Switch>
      </main>
      {!isAdminPage && <Footer />}
    </>
  )
}
