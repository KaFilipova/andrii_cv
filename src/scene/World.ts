import * as THREE from 'three'
import type { CameraShot, FrameContext, Station, StationFactory } from './types'
import { SLIDES } from '../content/slides'
import { PALETTE } from './palette'
import { distanceScaleFor, liftFractionFor, visibleHeight } from '../camera/framing'
import { makeRng } from '../utils/math'

import { createHero } from './stations/hero'
import { createWhoAmI } from './stations/whoami'
import { createStack } from './stations/stack'
import { createArc } from './stations/arc'
import { createConfigurator } from './stations/configurator'
import { createMechanics } from './stations/mechanics'
import { createTradeoffs } from './stations/tradeoffs'
import { createLuciad } from './stations/luciad'
import { createPerf } from './stations/perf'
import { createRealtime } from './stations/realtime'
import { createHowIWork } from './stations/howiwork'
import { createContact } from './stations/contact'

const FACTORIES: Record<string, StationFactory> = {
  hero: createHero,
  whoami: createWhoAmI,
  stack: createStack,
  arc: createArc,
  configurator: createConfigurator,
  mechanics: createMechanics,
  tradeoffs: createTradeoffs,
  luciad: createLuciad,
  perf: createPerf,
  realtime: createRealtime,
  howiwork: createHowIWork,
  contact: createContact,
}

/** How far the stations sit from the centre of the ring, in metres. */
const RING_RADIUS = 165
/** How much of a full turn the deck occupies. */
const RING_SWEEP = Math.PI * 1.55
/** Beyond this, a station is not drawn at all. */
const CULL_DISTANCE = 230

const _right = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _cameraUp = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

/**
 * Every station, placed once around a wide ring.
 *
 * Stations are authored in a comfortable local frame — subject at the origin,
 * camera somewhere along +Z — and the world rotates both the group and its
 * camera shot into place. That way a station file never has to know where in
 * the deck it ended up, and the far side of the ring stays visible through the
 * fog as a hint that this is one place rather than eleven slides.
 */
export class World {
  readonly scene: THREE.Scene
  private readonly stations: Station[] = []
  private readonly anchors: THREE.Vector3[] = []
  private readonly context: FrameContext
  private readonly stars: THREE.Points

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.context = {
      dt: 0,
      time: 0,
      focus: 0,
      pointer: new THREE.Vector2(),
      camera,
      aspect: camera.aspect,
    }

    SLIDES.forEach((slide, i) => {
      const factory = FACTORIES[slide.id]
      if (!factory) throw new Error(`No station registered for slide "${slide.id}"`)

      const angle = (i / Math.max(1, SLIDES.length - 1)) * RING_SWEEP - RING_SWEEP / 2
      const anchor = new THREE.Vector3(
        Math.cos(angle) * RING_RADIUS,
        Math.sin(i * 1.27) * 3.5,
        Math.sin(angle) * RING_RADIUS,
      )
      // Turn the station so its authored +Z faces away from the ring centre.
      const yaw = Math.PI / 2 - angle

      const station = factory(anchor)
      station.group.rotation.y = yaw
      // The group's own position already carries the anchor, so rotating about
      // the origin would swing it off the ring — rotate the mesh in place.
      station.group.position.copy(anchor)

      const rotation = new THREE.Matrix4().makeRotationY(yaw)
      rotateAbout(station.shot.position, anchor, rotation)
      rotateAbout(station.shot.target, anchor, rotation)

      scene.add(station.group)
      this.stations.push(station)
      this.anchors.push(anchor)
    })

    this.stars = buildStarfield()
    scene.add(this.stars)

    const ambient = new THREE.AmbientLight(PALETTE.ink, 0.12)
    scene.add(ambient)
  }

  /**
   * The parked camera shot for a slide, fitted to the window it has to play in.
   *
   * Wide window: the camera pans sideways by the station's `bias`, so the copy
   * sits beside the subject rather than on top of it.
   *
   * Narrow window: the copy moves to the bottom of the screen instead, so the
   * sideways pan is dropped, the camera backs off until the subject fits the
   * thinner field, and it pans *down* — which lifts the subject into the clear
   * air above the copy.
   */
  shotFor(index: number, aspect: number): CameraShot {
    const station = this.stations[index]
    const shot: CameraShot = {
      position: station.shot.position.clone(),
      target: station.shot.target.clone(),
    }

    _forward.subVectors(shot.target, shot.position).normalize()
    _right.crossVectors(_forward, _up).normalize()

    // Back off along the station's own view axis, which keeps the pitch the
    // author chose and only changes how much of the subject is in shot.
    const distanceScale = distanceScaleFor(aspect)
    if (distanceScale !== 1) {
      shot.position.sub(shot.target).multiplyScalar(distanceScale).add(shot.target)
    }

    const bias = station.bias ?? 0
    const biasScale = aspect < 1.15 ? 0 : Math.min(1, (aspect - 1.15) / 0.5)
    if (bias !== 0 && biasScale > 0) {
      shot.position.addScaledVector(_right, -bias * biasScale)
      shot.target.addScaledVector(_right, -bias * biasScale)
    }

    const lift = liftFractionFor(aspect)
    if (lift > 0) {
      // Panning the camera down moves the subject up the screen.
      _cameraUp.crossVectors(_right, _forward).normalize()
      const distance = shot.position.distanceTo(shot.target)
      const drop = visibleHeight(distance, aspect) * lift
      shot.position.addScaledVector(_cameraUp, -drop)
      shot.target.addScaledVector(_cameraUp, -drop)
    }

    return shot
  }

  anchorFor(index: number): THREE.Vector3 {
    return this.anchors[index]
  }

  /**
   * @param focusOf returns 1 for the slide the camera is parked at and fades
   *   through the pair involved in a travel.
   */
  update(
    dt: number,
    time: number,
    pointer: THREE.Vector2,
    camera: THREE.PerspectiveCamera,
    focusOf: (index: number) => number,
  ): void {
    this.context.dt = dt
    this.context.time = time
    this.context.pointer.copy(pointer)
    this.context.aspect = camera.aspect

    for (let i = 0; i < this.stations.length; i += 1) {
      const station = this.stations[i]
      const distance = camera.position.distanceTo(this.anchors[i])
      const visible = distance < CULL_DISTANCE
      station.group.visible = visible
      if (!visible) continue

      this.context.focus = focusOf(i)
      station.update?.(this.context)
    }

    this.stars.rotation.y = time * 0.004
  }

  dispose(): void {
    this.stations.forEach((station) => {
      this.scene.remove(station.group)
      station.dispose?.()
    })
    this.scene.remove(this.stars)
    this.stars.geometry.dispose()
    ;(this.stars.material as THREE.Material).dispose()
  }
}

const rotateAbout = (v: THREE.Vector3, pivot: THREE.Vector3, matrix: THREE.Matrix4): void => {
  v.sub(pivot).applyMatrix4(matrix).add(pivot)
}

/** A sparse shell of points far outside the ring — depth, not decoration. */
const buildStarfield = (): THREE.Points => {
  const rng = makeRng(1337)
  const count = 1400
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const theta = rng() * Math.PI * 2
    const phi = Math.acos(rng() * 2 - 1)
    const radius = 380 + rng() * 260
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.45
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: PALETTE.ink,
      size: 1.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      fog: false,
    }),
  )
}
