import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import axios from 'axios'
import { userAtom, adminAtom } from '../state/auth'

// LEARNING NOTE: useEffect retrieves REST API data on mount.
// Separate atoms allow independent authentication sessions.

export default function AuthSession() {
  const setUser = useSetAtom(userAtom)
  const setAdmin = useSetAtom(adminAtom)

  useEffect(() => {
    const controller = new AbortController()

    function loadSession(url, setter) {
      axios.get(url, { signal: controller.signal })
        .then(response => setter(response.data.user))
        .catch(error => {
          if (!axios.isCancel(error)) setter(null)
        })
    }

    loadSession('/api/auth/me', setUser)
    loadSession('/api/admin/auth/me', setAdmin)

    return () => controller.abort()
  }, [setUser, setAdmin])

  return null
}
