import * as THREE from 'three'
import type { CameraShot } from '../scene/types'
import { damp, easeInOutCubic } from '../utils/math'

const _from = { position: new THREE.Vector3(), target: new THREE.Vector3() }
const _to = { position: new THREE.Vector3(), target: new THREE.Vector3() }
const _control = new THREE.Vector3()
const _basePos = new THREE.Vector3()
const _baseTarget = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _tmp = new THREE.Vector3()

/**
 * Moves the camera between station shots.
 *
 * Two details make the move read as flight rather than a dolly: the position
 * follows a quadratic bezier lifted above the straight line, and the look-at
 * point eases on its own curve, so the world swings past instead of sliding.
 */
export class CameraRig {
  private readonly camera: THREE.PerspectiveCamera
  private readonly parallax = new THREE.Vector2()

  private travelT = 1
  private travelDuration = 1
  private arc = 0
  private idle = 0

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
  }

  get traveling(): boolean {
    return this.travelT < 1
  }

  /** 0 while leaving the previous station, 1 once parked at the new one. */
  get progress(): number {
    return this.travelT
  }

  jumpTo(shot: CameraShot): void {
    _from.position.copy(shot.position)
    _from.target.copy(shot.target)
    _to.position.copy(shot.position)
    _to.target.copy(shot.target)
    _control.copy(shot.position)
    this.travelT = 1
    this.camera.position.copy(shot.position)
    this.camera.lookAt(shot.target)
  }

  travelTo(shot: CameraShot, distanceHint: number): void {
    _from.position.copy(_basePos.lengthSq() === 0 ? this.camera.position : _basePos)
    _from.target.copy(_baseTarget.lengthSq() === 0 ? _to.target : _baseTarget)
    _to.position.copy(shot.position)
    _to.target.copy(shot.target)

    // The lift scales with how far we are going, so neighbouring stations get a
    // short hop and a jump across the deck gets a real arc.
    const span = _from.position.distanceTo(_to.position)
    this.arc = Math.min(span * 0.18, 22)
    _control
      .copy(_from.position)
      .add(_to.position)
      .multiplyScalar(0.5)
      .addScaledVector(_tmp.set(0, 1, 0), this.arc)

    this.travelDuration = THREE.MathUtils.clamp(0.9 + span / 110, 1.1, 2.4) * (distanceHint > 1 ? 1.15 : 1)
    this.travelT = 0
  }

  update(dt: number, pointer: THREE.Vector2): void {
    if (this.travelT < 1) {
      this.travelT = Math.min(1, this.travelT + dt / this.travelDuration)
    }

    const e = easeInOutCubic(this.travelT)

    // Quadratic bezier: (1-t)^2 A + 2(1-t)t C + t^2 B
    const inv = 1 - e
    _basePos
      .copy(_from.position)
      .multiplyScalar(inv * inv)
      .addScaledVector(_control, 2 * inv * e)
      .addScaledVector(_to.position, e * e)

    _baseTarget.lerpVectors(_from.target, _to.target, easeInOutCubic(Math.min(1, this.travelT * 1.12)))

    this.idle += dt

    // Parallax is strongest when parked and fades out during a move, so the
    // mouse never fights the travel curve.
    const settle = 1 - Math.abs(Math.sin(Math.PI * this.travelT)) * 0.9
    this.parallax.x = damp(this.parallax.x, pointer.x * 1.5 * settle, 0.0015, dt)
    this.parallax.y = damp(this.parallax.y, pointer.y * 0.9 * settle, 0.0015, dt)

    _forward.subVectors(_baseTarget, _basePos).normalize()
    _right.crossVectors(_forward, _tmp.set(0, 1, 0)).normalize()
    _up.crossVectors(_right, _forward).normalize()

    const breathe = Math.sin(this.idle * 0.32) * 0.22 * settle

    this.camera.position
      .copy(_basePos)
      .addScaledVector(_right, this.parallax.x)
      .addScaledVector(_up, this.parallax.y + breathe)

    this.camera.lookAt(_baseTarget)
  }
}
