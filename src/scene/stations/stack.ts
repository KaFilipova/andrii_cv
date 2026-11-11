import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, label, marker, ring, segment } from '../builders'

interface Orbiter {
  pivot: THREE.Group
  speed: number
  bob: number
  text: THREE.Object3D
}

const DAILY = [
  'Three.js',
  'TypeScript',
  'React',
  'WebGL',
  'zustand',
  'Vite',
  'Node.js',
  'WebSockets',
]

const REACH = [
  'React Three Fiber',
  'Vue 3',
  'Next.js',
  'Pixi.js',
  'three-mesh-bvh',
  'WebRTC',
  'Chrome Extensions',
  'React Native',
  'PostgreSQL',
  'Docker',
  'Redux',
  'Tailwind',
]

/**
 * Two orbits around a core: the inner one is what I touch daily, the outer one
 * is what the project decides. Labels billboard so the ring reads from any
 * camera angle; the station is the one the viewer may drag.
 */
export const createStack: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const spinner = new THREE.Group()
  group.add(spinner)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshStandardMaterial({
      color: PALETTE.deep,
      roughness: 0.3,
      metalness: 0.7,
      flatShading: true,
    }),
  )
  spinner.add(core)
  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.27, 1)),
    new THREE.LineBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.6 }),
  )
  spinner.add(coreWire)

  const orbiters: Orbiter[] = []

  const buildOrbit = (
    names: string[],
    radius: number,
    tilt: number,
    color: THREE.Color,
    size: number,
    dotRadius: number,
  ) => {
    const orbit = new THREE.Group()
    orbit.rotation.x = tilt
    spinner.add(orbit)

    const guide = ring(radius, color, 0.18)
    orbit.add(guide)

    names.forEach((name, i) => {
      const angle = (i / names.length) * Math.PI * 2
      const pivot = new THREE.Group()
      pivot.rotation.y = angle
      orbit.add(pivot)

      const node = new THREE.Group()
      node.position.set(radius, 0, 0)
      pivot.add(node)

      const dot = marker(dotRadius, color)
      node.add(dot)

      const halo = ring(dotRadius * 2.6, color, 0.3, 32)
      halo.rotation.x = Math.PI / 2
      node.add(halo)

      const text = label(name, { size, color: PALETTE.ink, opacity: 0.92 })
      text.position.set(0, dotRadius + size * 0.9, 0)
      node.add(text)

      // The spoke belongs to the pivot, so it turns with its node.
      pivot.add(segment(new THREE.Vector3(0, 0, 0), new THREE.Vector3(radius, 0, 0), color, 0.09))

      orbiters.push({ pivot, speed: 0.06 + (i % 3) * 0.012, bob: i * 0.8, text })
    })
  }

  buildOrbit(DAILY, 3.4, 0, PALETTE.accent, 0.26, 0.09)
  buildOrbit(REACH, 5.8, 0.26, PALETTE.steel, 0.2, 0.07)

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.5)
  group.add(ambient)
  const key = new THREE.PointLight(PALETTE.accent, 90, 30, 2)
  key.position.set(3, 5, 6)
  group.add(key)

  let drag = 0

  return {
    id: 'stack',
    group,
    bias: -7.2,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0, 5.6, 21)),
      target: anchor.clone(),
    },
    update({ dt, time, focus, pointer, camera, aspect }) {
      // Pointer nudges the spin rather than taking control of it: the ring keeps
      // its own motion during the talk and answers when someone reaches for it.
      drag += (pointer.x * 0.5 - drag) * Math.min(1, dt * 2.2)
      spinner.rotation.y += dt * (0.08 + drag * 0.5 * focus)
      // Nearly edge-on the orbits collapse into a line. A tall frame has the
      // room to look down on them, and that is where they read as rings.
      const tilt = aspect < 1.05 ? 0.46 : 0.1
      spinner.rotation.x = tilt + pointer.y * 0.12 * focus

      core.rotation.y -= dt * 0.25
      core.rotation.x = Math.sin(time * 0.3) * 0.2

      orbiters.forEach((o) => {
        o.pivot.rotation.y += dt * o.speed
        billboard(o.text, camera)
        o.text.position.y = 0.42 + Math.sin(time * 0.8 + o.bob) * 0.05
      })
    },
    dispose() {
      disposeTree(group)
    },
  }
}
