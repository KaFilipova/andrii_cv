import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { disposeTree, marker, ring, segment } from '../builders'
import { makeRng } from '../../utils/math'

/**
 * The closing shot: the core from the title, opened out into the five ways to
 * reach me. The DOM carries the addresses; this is only the shape of them.
 */
export const createContact: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)
  const rng = makeRng(5)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 1),
    new THREE.MeshStandardMaterial({
      color: PALETTE.deep,
      roughness: 0.3,
      metalness: 0.65,
      flatShading: true,
    }),
  )
  group.add(core)

  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.42, 1)),
    new THREE.LineBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.6 }),
  )
  group.add(coreWire)

  const spokes: { node: THREE.Mesh; base: THREE.Vector3; phase: number }[] = []
  const count = 5
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const radius = 4.4
    const base = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.6) * 1.1,
      Math.sin(angle) * radius * 0.5,
    )
    const node = marker(0.16, i % 2 === 0 ? PALETTE.accent : PALETTE.accentWarm)
    node.position.copy(base)
    group.add(node)
    group.add(segment(new THREE.Vector3(0, 0, 0), base, PALETTE.steel, 0.28))
    spokes.push({ node, base, phase: rng() * Math.PI * 2 })
  }

  const halo = ring(6.6, PALETTE.accent, 0.2)
  halo.rotation.x = 0.4
  group.add(halo)

  const halo2 = ring(8.2, PALETTE.steel, 0.14)
  halo2.rotation.set(0.9, 0.3, 0)
  group.add(halo2)

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.5)
  group.add(ambient)
  const key = new THREE.PointLight(PALETTE.accent, 90, 26, 2)
  key.position.set(3, 4, 6)
  group.add(key)

  return {
    id: 'contact',
    group,
    // Same framing idea as the title: the constellation sits low, the contact
    // rows sit in the clear air above it.
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0, 6.0, 19)),
      target: anchor.clone().add(new THREE.Vector3(0, 4.2, 0)),
    },
    update({ time, dt }) {
      core.rotation.y = time * 0.1
      coreWire.rotation.y = time * 0.1
      core.rotation.x = Math.sin(time * 0.17) * 0.12
      coreWire.rotation.x = core.rotation.x

      halo.rotation.z += dt * 0.05
      halo2.rotation.z -= dt * 0.03

      spokes.forEach((spoke) => {
        const pulse = 1 + Math.sin(time * 1.1 + spoke.phase) * 0.22
        spoke.node.scale.setScalar(pulse)
        spoke.node.position.y = spoke.base.y + Math.sin(time * 0.6 + spoke.phase) * 0.18
      })
    },
    dispose() {
      disposeTree(group)
    },
  }
}
