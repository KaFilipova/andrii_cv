import type { Slide } from '../content/slides'

/**
 * The DOM half of a slide. It is deliberately plain HTML: text that has to stay
 * legible on someone else's projector, scale with the window and be readable by
 * a screen reader belongs in the document, not in a texture.
 *
 * The overlay is pointer-transparent, so a drag that starts over this copy
 * still reaches the scene behind it.
 */
export const SlideCopy = ({ slide }: { slide: Slide }) => (
  <article className="slide" data-align={slide.align ?? 'left'}>
    <p className="slide__kicker">
      <span className="slide__rule" aria-hidden="true" />
      {slide.kicker}
    </p>

    <h1 className="slide__title" dangerouslySetInnerHTML={{ __html: slide.title }} />

    <p className="slide__lead">{slide.lead}</p>

    {slide.metrics && (
      <ul className="metrics">
        {slide.metrics.map((metric) => (
          <li key={metric.label}>
            <div className="metrics__value">{metric.value}</div>
            <div className="metrics__label">{metric.label}</div>
          </li>
        ))}
      </ul>
    )}

    {slide.bullets && (
      <ul className="bullets">
        {slide.bullets.map((bullet) => (
          <li key={bullet.title}>
            <span className="bullets__dot" aria-hidden="true" />
            <div>
              <div className="bullets__title">{bullet.title}</div>
              <div className="bullets__body">{bullet.body}</div>
            </div>
          </li>
        ))}
      </ul>
    )}

    {slide.contact && (
      <ul className="contact">
        {slide.contact.map((row) => (
          <li key={row.key}>
            <span className="contact__key">{row.key}</span>
            {row.href ? (
              <a href={row.href} target="_blank" rel="noreferrer">
                {row.value}
              </a>
            ) : (
              <span>{row.value}</span>
            )}
          </li>
        ))}
      </ul>
    )}

    {slide.note && <p className="slide__note">{slide.note}</p>}
  </article>
)
