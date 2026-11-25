import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { flashAtom } from '../state/auth'

// LEARNING NOTE: Shared notification component.
// useEffect controls automatic dismissal and timer cleanup.

export default function FlashMessage() {
  const [flash, setFlash] = useAtom(flashAtom)

  useEffect(() => {
    if (!flash) return

    const timer = setTimeout(() => setFlash(null), 4000)

    return () => clearTimeout(timer)
  }, [flash, setFlash])

  if (!flash) return null

  const isError = flash.type === 'danger'

  return (
    <div
      className={`brand-toast ${isError ? 'brand-toast-error' : ''}`}
      role={isError ? 'alert' : 'status'}
    >
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        {isError
          ? <path d="M12 7v6m0 4h.01" />
          : <path d="m8 12 3 3 5-6" />}
      </svg>

      <span>{flash.message}</span>

      <button
        type="button"
        className="brand-toast-close"
        aria-label="Dismiss notification"
        onClick={() => setFlash(null)}
      >
        ×
      </button>
    </div>
  )
}
