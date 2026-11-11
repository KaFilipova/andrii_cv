import { useEffect, useRef, useState } from 'react'
import { Deck } from './Deck'
import { Overlay } from '../ui/Overlay'
import { PROFILE } from '../content/slides'

/**
 * Mounts the canvas once and keeps React out of the frame loop. The only thing
 * that crosses the boundary is the deck store.
 */
export const App = () => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const deck = new Deck(host)
    // One frame of grace so the first render is a finished scene rather than
    // an empty canvas fading in.
    const timer = window.setTimeout(() => setBooted(true), 450)

    return () => {
      window.clearTimeout(timer)
      deck.dispose()
    }
  }, [])

  return (
    <>
      <div className="stage" ref={hostRef}>
        <div className="stage__vignette" />
        <div className="stage__scanlines" />
      </div>

      <Overlay />

      <div className="boot" data-done={booted} aria-hidden={booted}>
        <div className="boot__name">{PROFILE.name}</div>
        <div className="boot__bar">
          <div className="boot__fill" style={{ transform: `scaleX(${booted ? 1 : 0.35})` }} />
        </div>
      </div>
    </>
  )
}
