import * as THREE from 'three'
import { PALETTE } from '../scene/palette'
import { damp } from '../utils/math'

export interface EngineHooks {
  /** Called once per frame, before the render. */
  update: (dt: number, time: number, pointer: THREE.Vector2) => void
}

/**
 * Owns the canvas, the WebGL context and the frame loop. Nothing above this
 * file talks to `requestAnimationFrame`, and nothing in here knows what a slide
 * is — the deck drives the camera through `hooks.update`.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly canvas: HTMLCanvasElement

  private readonly host: HTMLElement
  private readonly clock = new THREE.Clock()
  private readonly rawPointer = new THREE.Vector2()
  private readonly pointer = new THREE.Vector2()
  private readonly resizeObserver: ResizeObserver
  private frameId = 0
  private running = false
  private elapsed = 0
  private hooks: EngineHooks | null = null

  constructor(host: HTMLElement) {
    this.host = host

    this.canvas = document.createElement('canvas')
    this.canvas.style.position = 'absolute'
    this.canvas.style.inset = '0'
    host.appendChild(this.canvas)

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setClearColor(PALETTE.bg, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = PALETTE.bg
    this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0075)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900)
    this.camera.position.set(0, 2, 12)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()

    window.addEventListener('pointermove', this.onPointerMove, { passive: true })
  }

  setHooks(hooks: EngineHooks): void {
    this.hooks = hooks
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.clock.start()
    this.loop()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.frameId)
  }

  dispose(): void {
    this.stop()
    this.resizeObserver.disconnect()
    window.removeEventListener('pointermove', this.onPointerMove)
    this.renderer.dispose()
    this.canvas.remove()
  }

  private onPointerMove = (event: PointerEvent): void => {
    const { innerWidth: w, innerHeight: h } = window
    this.rawPointer.set((event.clientX / w) * 2 - 1, -((event.clientY / h) * 2 - 1))
  }

  private resize(): void {
    const width = this.host.clientWidth || window.innerWidth
    const height = this.host.clientHeight || window.innerHeight
    // Capping DPR at 2 keeps a 4K laptop screen from quadrupling the fill cost
    // for a scene whose detail is lines rather than texture.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    // A portrait window loses horizontal framing; widening the FOV keeps the
    // station in shot instead of cropping it.
    this.camera.fov = this.camera.aspect < 1 ? 58 : 42
    this.camera.updateProjectionMatrix()
  }

  private loop = (): void => {
    if (!this.running) return
    this.frameId = requestAnimationFrame(this.loop)

    const dt = Math.min(this.clock.getDelta(), 1 / 20)
    this.elapsed += dt

    this.pointer.x = damp(this.pointer.x, this.rawPointer.x, 0.001, dt)
    this.pointer.y = damp(this.pointer.y, this.rawPointer.y, 0.001, dt)

    this.hooks?.update(dt, this.elapsed, this.pointer)
    this.renderer.render(this.scene, this.camera)
  }
}
