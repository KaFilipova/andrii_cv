import { Engine } from '../engine/Engine'
import { World } from '../scene/World'
import { CameraRig } from '../camera/CameraRig'
import { deckApi, indexFromHash } from '../state/deckStore'
import { SLIDES } from '../content/slides'

const WHEEL_THRESHOLD = 120
const INPUT_COOLDOWN = 0.35

/**
 * The boundary between React and the canvas.
 *
 * React never renders a frame and the engine never renders a DOM node; they
 * meet here, through the deck store. Input that changes the slide goes into the
 * store, and the store is what moves the camera — so a click on a nav dot and a
 * press of the right arrow take exactly the same path.
 */
export class Deck {
  private readonly host: HTMLElement
  private readonly engine: Engine
  private readonly world: World
  private readonly rig: CameraRig
  private readonly unsubscribe: () => void

  private wheelAccumulator = 0
  private cooldown = 0
  private touchStartX = 0
  private touchStartY = 0
  private resizeTimer = 0

  constructor(host: HTMLElement) {
    this.host = host
    this.engine = new Engine(host)
    this.world = new World(this.engine.scene, this.engine.camera)
    this.rig = new CameraRig(this.engine.camera)

    this.rig.jumpTo(this.world.shotFor(deckApi.getState().index, this.aspect))

    this.unsubscribe = deckApi.subscribe((state, previous) => {
      if (state.index === previous.index) return
      this.rig.travelTo(this.world.shotFor(state.index, this.aspect), Math.abs(state.index - previous.index))
      // replaceState, not a hash assignment: the address bar should name the
      // slide without filling the back button with eleven entries.
      const id = SLIDES[state.index].id
      window.history.replaceState(null, '', `#${id}`)
    })

    this.engine.setHooks({
      update: (dt, time, pointer) => {
        this.cooldown = Math.max(0, this.cooldown - dt)
        this.rig.update(dt, pointer)

        const { index, from, traveling, setTraveling } = deckApi.getState()
        const progress = this.rig.progress
        if (traveling && !this.rig.traveling) setTraveling(false)

        this.world.update(dt, time, pointer, this.engine.camera, (i) => {
          if (i === index) return traveling ? progress : 1
          if (i === from && traveling) return 1 - progress
          return 0
        })
      },
    })

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('wheel', this.onWheel, { passive: true })
    window.addEventListener('resize', this.onResize)
    window.addEventListener('hashchange', this.onHashChange)
    host.addEventListener('touchstart', this.onTouchStart, { passive: true })
    host.addEventListener('touchend', this.onTouchEnd, { passive: true })

    this.engine.start()
  }

  private get aspect(): number {
    return window.innerWidth / Math.max(1, window.innerHeight)
  }

  private step(delta: number): void {
    if (this.cooldown > 0) return
    this.cooldown = INPUT_COOLDOWN
    const { index, go } = deckApi.getState()
    go(index + delta)
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'Enter':
        event.preventDefault()
        this.step(1)
        return
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        event.preventDefault()
        this.step(-1)
        return
      case 'Home':
        event.preventDefault()
        deckApi.getState().go(0)
        return
      case 'End':
        event.preventDefault()
        deckApi.getState().go(SLIDES.length - 1)
        return
      default:
        break
    }

    // Number keys jump straight to a slide — useful when an interviewer asks
    // about one thing and the talk has to get there now.
    if (/^[1-9]$/.test(event.key)) {
      deckApi.getState().go(Number(event.key) - 1)
    } else if (event.key === '0') {
      deckApi.getState().go(9)
    }
  }

  private onWheel = (event: WheelEvent): void => {
    this.wheelAccumulator += event.deltaY
    if (Math.abs(this.wheelAccumulator) < WHEEL_THRESHOLD) return
    this.step(this.wheelAccumulator > 0 ? 1 : -1)
    this.wheelAccumulator = 0
  }

  private onTouchStart = (event: TouchEvent): void => {
    const touch = event.changedTouches[0]
    if (!touch) return
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
  }

  private onTouchEnd = (event: TouchEvent): void => {
    const touch = event.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - this.touchStartX
    const dy = touch.clientY - this.touchStartY
    if (Math.abs(dx) < 48 && Math.abs(dy) < 48) return
    if (Math.abs(dx) > Math.abs(dy)) this.step(dx < 0 ? 1 : -1)
    else this.step(dy < 0 ? 1 : -1)
  }

  private onHashChange = (): void => {
    deckApi.getState().go(indexFromHash(window.location.hash))
  }

  private onResize = (): void => {
    // The sideways pan depends on the aspect ratio, so a window resize has to
    // re-aim the camera — gently, and only once the dragging has stopped.
    window.clearTimeout(this.resizeTimer)
    this.resizeTimer = window.setTimeout(() => {
      const { index, traveling } = deckApi.getState()
      if (traveling) return
      this.rig.travelTo(this.world.shotFor(index, this.aspect), 0)
    }, 180)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('hashchange', this.onHashChange)
    this.host.removeEventListener('touchstart', this.onTouchStart)
    this.host.removeEventListener('touchend', this.onTouchEnd)
    window.clearTimeout(this.resizeTimer)
    this.unsubscribe()
    this.world.dispose()
    this.engine.dispose()
  }
}
