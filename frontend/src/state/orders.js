import { atom } from 'jotai'

// FF03: Share the submitted order with the confirmation page.
// Customer details are kept in memory, not localStorage.
export const confirmationAtom = atom(null)
