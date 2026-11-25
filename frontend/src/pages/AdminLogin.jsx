import LoginForm from '../components/LoginForm'

// Reuse LoginForm with a different prop value.

export default function AdminLogin() {
  return <LoginForm admin={true} />
}
