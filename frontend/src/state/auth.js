import { atom } from 'jotai'

// LEARNING NOTE: GLOBAL STATE MANAGEMENT
// Jotai atoms allow multiple React components to share
// authentication state without passing props through
// every intermediate component (prop drilling).
//
// undefined = checking session
// null = signed out
// object = authenticated user

export const userAtom = atom(undefined)
export const adminAtom = atom(undefined)
export const flashAtom = atom(null)
