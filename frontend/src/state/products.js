import { atom } from 'jotai'

// FF03: Sharing state between independent components.
// FF05: Global state management.
// LO4: The storefront and management page share this array.
// Updating the atom triggers subscribed components to render.

export const productsAtom = atom([])
