import { PROFILE, SLIDES } from '../content/slides'
import { useDeck } from '../state/deckStore'
import { SlideCopy } from './SlideCopy'

/**
 * Everything the viewer reads. It sits above the canvas and stays
 * pointer-transparent except for the controls, so a drag anywhere on the page
 * still reaches the scene.
 */
export const Overlay = () => {
  const index = useDeck((s) => s.index)
  const traveling = useDeck((s) => s.traveling)
  const go = useDeck((s) => s.go)
  const slide = SLIDES[index]

  return (
    <div className="overlay">
      {/* Only drawn in the stacked layout, where the copy sits over the scene
          instead of beside it and needs something to be legible against. */}
      <div className="overlay__scrim" aria-hidden="true" />

      <header className="topbar">
        <span className="topbar__name">
          {PROFILE.name} — {PROFILE.role}
        </span>
        <span className="topbar__right">
          <span>{PROFILE.location}</span>
          <span>
            {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          </span>
        </span>
      </header>

      <SlideCopy slide={slide} key={slide.id} />

      <nav className="rail" aria-label="Slides">
        <div className="rail__dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="dot"
              aria-current={i === index}
              aria-label={`${i + 1}. ${s.nav}`}
              onClick={() => go(i)}
            >
              <span className="dot__tip">{s.nav}</span>
            </button>
          ))}
        </div>

        <div className="rail__hint" data-live={Boolean(slide.interaction) && !traveling}>
          {slide.interaction && !traveling ? (
            <span>{slide.interaction}</span>
          ) : (
            <>
              <span>
                <kbd>←</kbd> <kbd>→</kbd> move
              </span>
              <span>scroll or swipe</span>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
