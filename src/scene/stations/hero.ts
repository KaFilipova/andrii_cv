import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { disposeTree, gridFloor, ring } from '../builders'
import { makeRng } from '../../utils/math'

/**
 * The opening shot: a slowly turning core inside three tilted rings, with a
 * field of motes drifting around it. Nothing here is a metaphor — it exists to
 * establish the material language (thin lines, one accent, dark air) before any
 * content arrives.
 */
export const createHero: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const core = new THREE.Group()
  group.add(core)

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.6, 1),
    new THREE.MeshStandardMaterial({
      color: PALETTE.deep,
      roughness: 0.35,
      metalness: 0.6,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
    }),
  )
  core.add(shell)

  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.62, 1)),
    new THREE.LineBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.55 }),
  )
  core.add(wire)

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 0),
    new THREE.MeshBasicMaterial({ color: PALETTE.accent, toneMapped: false, wireframe: true }),
  )
  core.add(inner)

  const rings: THREE.LineLoop[] = []
  const tilts: [number, number, number][] = [
    [0.1, 0, 0.25],
    [1.2, 0.4, 0],
    [0.6, 1.1, 0.8],
  ]
  tilts.forEach((tilt, i) => {
    const r = ring(4.6 + i * 1.5, i === 1 ? PALETTE.accentWarm : PALETTE.accent, 0.28)
    r.rotation.set(tilt[0], tilt[1], tilt[2])
    rings.push(r)
    group.add(r)
  })

  // Motes: one buffer, one draw call, deterministic positions.
  const rng = makeRng(7)
  const count = 460
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    const radius = 6 + rng() * 22
    const theta = rng() * Math.PI * 2
    const y = (rng() - 0.5) * 14
    positions[i * 3] = Math.cos(theta) * radius
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * radius
    phases[i] = rng() * Math.PI * 2
  }
  const moteGeometry = new THREE.BufferGeometry()
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      color: PALETTE.ink,
      size: 0.055,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  )
  group.add(motes)

  const floor = gridFloor(90, 45, 0.1)
  floor.position.y = -7
  group.add(floor)

  const key = new THREE.PointLight(PALETTE.accent, 120, 40, 2)
  key.position.set(5, 6, 7)
  group.add(key)
  const rim = new THREE.PointLight(PALETTE.accentWarm, 70, 40, 2)
  rim.position.set(-7, -3, -5)
  group.add(rim)

  const base = positions.slice()

  return {
    id: 'hero',
    group,
    // Aimed above the core so it settles into the lower third and the centred
    // title has clean air to sit in.
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0, 7.8, 20.5)),
      target: anchor.clone().add(new THREE.Vector3(0, 6.2, 0)),
    },
    update({ time, focus }) {
      core.rotation.y = time * 0.14
      core.rotation.x = Math.sin(time * 0.21) * 0.16
      inner.rotation.y = -time * 0.35
      inner.rotation.z = time * 0.2

      rings.forEach((r, i) => {
        r.rotation.z += (i % 2 === 0 ? 0.0016 : -0.0012) * (1 + focus)
        r.rotation.x += 0.0004
      })

      const attr = moteGeometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < count; i += 1) {
        const p = phases[i]
        attr.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time * 0.25 + p) * 0.9
      }
      attr.needsUpdate = true
      motes.rotation.y = time * 0.012
    },
    dispose() {
      disposeTree(group)
    },
  }
}
