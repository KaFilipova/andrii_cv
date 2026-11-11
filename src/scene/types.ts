import type * as THREE from 'three'

/** Per-frame information handed to every station that asks for it. */
export interface FrameContext {
  /** Seconds since the previous frame, clamped so a tab switch cannot explode physics. */
  dt: number
  /** Seconds since start. */
  time: number
  /** 1 when the camera is parked at this station, 0 when it is somewhere else. */
  focus: number
  /** Pointer in normalised device coordinates, smoothed. */
  pointer: THREE.Vector2
  /** The live camera — stations use it to billboard labels. */
  camera: THREE.PerspectiveCamera
  /**
   * Viewport aspect. A station reads it when its shape only works one way up:
   * a ring seen from a shallow angle is a line, and a phone frame is tall.
   */
  aspect: number
}

export interface CameraShot {
  position: THREE.Vector3
  target: THREE.Vector3
}

export interface Station {
  id: string
  group: THREE.Group
  /**
   * Where the camera parks for this slide, framed dead centre. The deck pans
   * it sideways by `bias` so the DOM copy does not sit on top of the subject.
   */
  shot: CameraShot
  /** Positive pushes the subject to screen-right (copy on the left). */
  bias?: number
  update?: (ctx: FrameContext) => void
  dispose?: () => void
}

/** A station is built once, at its world anchor, and never moved afterwards. */
export type StationFactory = (anchor: THREE.Vector3) => Station
