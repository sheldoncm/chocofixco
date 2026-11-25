import { useAtomValue } from 'jotai'
import { Redirect } from 'wouter'
import { userAtom, adminAtom } from '../state/auth'

// LEARNING NOTE: CONDITIONAL RENDERING AND PROPS
// This reusable component controls which pages
// authenticated customers and administrators can see.
//
// Backend middleware independently enforces security.

export default function ProtectedRoute(props) {
  const user = useAtomValue(
    props.role === 'admin' ? adminAtom : userAtom
  )

  if (user === undefined) {
    return (
      <div className="container py-5" role="status">
        Checking your session...
      </div>
    )
  }

  if (!user) {
    return (
      <Redirect to={
        props.role === 'admin' ? '/admin/login' : '/login'
      } />
    )
  }

  if (props.role && user.role !== props.role) {
    return (
      <div className="container py-5">
        <h1>Access denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  return props.children
}
