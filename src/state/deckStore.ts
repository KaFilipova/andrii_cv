import { create } from 'zustand'
import { SLIDES, SLIDE_IDS } from '../content/slides'

/**
 * `#luciad` in the address bar opens on the geospatial station. It makes the
 * deck linkable — a follow-up email can point at one slide — and it is how the
 * screenshots in `npm run shots` are taken.
 */
export const indexFromHash = (hash: string): number => {
  const id = hash.replace(/^#/, '')
  const found = SLIDE_IDS.indexOf(id)
  return found === -1 ? 0 : found
}

interface DeckState {
  index: number
  /** Where the camera is coming from, so the world can cross-fade focus. */
  from: number
  traveling: boolean
  ready: boolean
  go: (index: number) => void
  next: () => void
  back: () => void
  setTraveling: (traveling: boolean) => void
  setReady: (ready: boolean) => void
}

const last = SLIDES.length - 1
const clampIndex = (i: number): number => (i < 0 ? 0 : i > last ? last : i)

/**
 * The only shared state in the app: which slide is on, and whether the camera
 * is still moving. The 3D side reads it imperatively through `subscribe`; React
 * reads it through the hook. Neither drives the other's frame loop.
 */
const initial = typeof window === 'undefined' ? 0 : indexFromHash(window.location.hash)

export const useDeck = create<DeckState>((set, get) => ({
  index: initial,
  from: initial,
  traveling: false,
  ready: false,
  go: (index) => {
    const target = clampIndex(index)
    const current = get().index
    if (target === current) return
    set({ index: target, from: current, traveling: true })
  },
  next: () => get().go(get().index + 1),
  back: () => get().go(get().index - 1),
  setTraveling: (traveling) => set({ traveling }),
  setReady: (ready) => set({ ready }),
}))

export const deckApi = useDeck
