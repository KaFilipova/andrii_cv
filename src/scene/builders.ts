import * as THREE from 'three'
import { Text } from 'troika-three-text'
import { PALETTE } from './palette'
// The same two files the CSS uses. troika reads .ttf, .otf and .woff — not
// .woff2 — so these are the woff builds on purpose.
import interUrl from '../assets/fonts/Inter-500.woff?url'
import monoUrl from '../assets/fonts/JetBrainsMono-400.woff?url'

/**
 * Geometry helpers shared by the stations. Everything here returns plain
 * three.js objects — no station state, no frame logic.
 */

export interface LabelOptions {
  size?: number
  color?: THREE.Color | number
  mono?: boolean
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
  opacity?: number
  letterSpacing?: number
  maxWidth?: number
}

/** SDF text that stays crisp at any camera distance. */
export const label = (text: string, options: LabelOptions = {}): Text => {
  const t = new Text()
  t.text = text
  t.font = options.mono ? monoUrl : interUrl
  t.fontSize = options.size ?? 0.4
  t.color = options.color ?? PALETTE.ink
  t.anchorX = options.anchorX ?? 'center'
  t.anchorY = options.anchorY ?? 'middle'
  t.letterSpacing = options.letterSpacing ?? 0
  t.material.transparent = true
  t.material.opacity = options.opacity ?? 1
  t.material.depthWrite = false
  t.material.toneMapped = false
  if (options.maxWidth) t.maxWidth = options.maxWidth
  t.sync()
  return t
}

/** Outline-only box — the deck's default way of drawing volume. */
export const wireBox = (
  width: number,
  height: number,
  depth: number,
  color: THREE.Color = PALETTE.steel,
  opacity = 0.55,
): THREE.LineSegments => {
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth))
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
  return new THREE.LineSegments(geometry, material)
}

/** Shaded box with its own crisp outline, which flat shading alone will not give. */
export const solidBox = (
  width: number,
  height: number,
  depth: number,
  color: THREE.Color = PALETTE.deep,
  edge: THREE.Color = PALETTE.steel,
): THREE.Mesh => {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.18 }),
  )
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.5, depthWrite: false }),
  )
  mesh.add(edges)
  return mesh
}

/** A small unlit sphere used for ports, nodes and accents. */
export const marker = (radius: number, color: THREE.Color, opacity = 1): THREE.Mesh => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false }),
  )
  return mesh
}

/** Flat circle outline, drawn in the XZ plane. */
export const ring = (radius: number, color: THREE.Color, opacity = 0.35, segments = 96): THREE.LineLoop => {
  const points: number[] = []
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2
    points.push(Math.cos(a) * radius, 0, Math.sin(a) * radius)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  )
}

/** Straight line between two points. */
export const segment = (
  a: THREE.Vector3,
  b: THREE.Vector3,
  color: THREE.Color,
  opacity = 0.4,
): THREE.Line => {
  const geometry = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()])
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  )
}

/** The dark technical floor every station stands on. */
export const gridFloor = (size: number, divisions: number, opacity = 0.16): THREE.GridHelper => {
  const grid = new THREE.GridHelper(size, divisions, PALETTE.accent, PALETTE.steel)
  const material = grid.material as THREE.LineBasicMaterial | THREE.LineBasicMaterial[]
  const apply = (m: THREE.LineBasicMaterial) => {
    m.transparent = true
    m.opacity = opacity
    m.depthWrite = false
  }
  if (Array.isArray(material)) material.forEach(apply)
  else apply(material)
  return grid
}

const _parentQuat = new THREE.Quaternion()
const _cameraQuat = new THREE.Quaternion()

/**
 * Faces an object at the camera.
 *
 * `quaternion` is local, and every station is rotated into its place on the
 * ring, so copying the camera's rotation straight across leaves labels turned
 * by the station's yaw. The parent's world rotation has to be divided out.
 */
export const billboard = (object: THREE.Object3D, camera: THREE.Camera): void => {
  camera.getWorldQuaternion(_cameraQuat)
  if (object.parent) {
    object.parent.getWorldQuaternion(_parentQuat)
    object.quaternion.copy(_parentQuat.invert().multiply(_cameraQuat))
  } else {
    object.quaternion.copy(_cameraQuat)
  }
}

/** Walks a subtree and frees every geometry and material it owns. */
export const disposeTree = (root: THREE.Object3D): void => {
  root.traverse((object) => {
    const anyObject = object as unknown as {
      geometry?: THREE.BufferGeometry
      material?: THREE.Material | THREE.Material[]
      dispose?: () => void
    }
    if (typeof anyObject.dispose === 'function' && (object as Text).isTroikaText) {
      anyObject.dispose()
      return
    }
    anyObject.geometry?.dispose()
    const material = anyObject.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material?.dispose()
  })
}
