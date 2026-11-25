import LoginForm from '../components/LoginForm'

// LEARNING NOTE: COMPONENT COMPOSITION
// A page is composed of reusable child components.

export default function Login() {
  return <LoginForm admin={false} />
}
