import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, keyLight, label, marker, segment, solidBox } from '../builders'
import { clamp, easeOutBack } from '../../utils/math'

interface Bar {
  mesh: THREE.Mesh
  target: number
  delay: number
  pulse: THREE.Mesh
}

interface RoleSpec {
  name: string
  from: number
  to: number
  lane: number
  height: number
}

const START = 2021
const END = 2026.9
const SPAN = 11.5

/** Years map onto a fixed rail so two roles in the same year line up. */
const x = (year: number): number => ((year - START) / (END - START)) * SPAN - SPAN / 2

const ROLES: RoleSpec[] = [
  { name: 'Freelance', from: 2021, to: 2022, lane: 0, height: 1.3 },
  { name: 'New Wiring — robot UI', from: 2022, to: 2023, lane: 1, height: 2.6 },
  { name: 'Creative Fun Planet — lead', from: 2023, to: 2023.95, lane: 0, height: 2.2 },
  { name: 'AINSYS — tech lead', from: 2023.95, to: 2024.7, lane: 2, height: 2.0 },
  { name: 'WhoCPA — WebRTC CRM', from: 2024.7, to: 2025.4, lane: 1, height: 2.4 },
  { name: 'Python Automation — lead', from: 2024.7, to: 2025.7, lane: 3, height: 1.6 },
  { name: 'AttractGroup — 3D', from: 2025.4, to: 2026.9, lane: 2, height: 3.6 },
]

const LANE_Z = [0, -1.9, -3.8, -5.7]
const LANE_COLOR = [PALETTE.steel, PALETTE.accentWarm, PALETTE.accent, PALETTE.violet]

/**
 * The career as a rail. Bars grow out of the timeline when the station takes
 * focus, which gives the speaker a beat to land the first sentence on.
 */
export const createArc: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const bars: Bar[] = []
  const billboards: THREE.Object3D[] = []

  // The rail and its year ticks.
  group.add(
    segment(
      new THREE.Vector3(-SPAN / 2 - 0.6, 0, 0.6),
      new THREE.Vector3(SPAN / 2 + 0.6, 0, 0.6),
      PALETTE.steel,
      0.5,
    ),
  )

  for (let year = 2021; year <= 2026; year += 1) {
    const px = x(year)
    group.add(
      segment(
        new THREE.Vector3(px, -0.22, 0.6),
        new THREE.Vector3(px, 0.22, 0.6),
        PALETTE.steel,
        0.45,
      ),
    )
    const tick = label(String(year), {
      size: 0.22,
      color: PALETTE.steel,
      mono: true,
      letterSpacing: 0.1,
    })
    tick.position.set(px, -0.65, 0.6)
    group.add(tick)
    billboards.push(tick)
  }

  ROLES.forEach((role, i) => {
    const width = Math.max(x(role.to) - x(role.from) - 0.22, 0.6)
    const cx = (x(role.from) + x(role.to)) / 2
    const z = LANE_Z[role.lane]
    const color = LANE_COLOR[role.lane]

    const mesh = solidBox(width, role.height, 0.95, PALETTE.deep, color)
    mesh.position.set(cx, 0, z)
    mesh.scale.y = 0.001
    group.add(mesh)

    const pulse = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.06, 0.05, 1.01),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
    )
    pulse.position.set(cx, 0, z)
    group.add(pulse)

    const text = label(role.name, { size: 0.26, color: PALETTE.ink, opacity: 0.88 })
    // Lanes are stacked in depth, so without a vertical stagger two labels
    // in the same year project onto the same patch of screen.
    text.position.set(cx, role.height + 0.55 + role.lane * 0.52, z)
    group.add(text)
    billboards.push(text)

    const dot = marker(0.07, color)
    dot.position.set(x(role.from), 0, 0.6)
    group.add(dot)

    bars.push({ mesh, target: role.height, delay: i * 0.13, pulse })
  })

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.5)
  group.add(ambient)
  keyLight(group, 1.0, 2, 8, 9)

  let grown = 0

  return {
    id: 'arc',
    group,
    bias: 5.8,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0, 7.2, 19.5)),
      target: anchor.clone().add(new THREE.Vector3(0, 1.4, -2.2)),
    },
    update({ dt, time, focus, camera }) {
      // Grow on arrival, retract slowly once the camera leaves, so coming back
      // replays the reveal instead of showing a finished chart.
      grown = clamp(grown + dt * (focus > 0.6 ? 0.9 : -0.6), 0, 1.8)

      bars.forEach((bar) => {
        const t = clamp((grown - bar.delay) / 0.75, 0, 1)
        const scale = Math.max(0.001, easeOutBack(t))
        bar.mesh.scale.y = scale
        bar.mesh.position.y = (bar.target * scale) / 2
        bar.pulse.position.y = bar.target * scale + 0.03
        const material = bar.pulse.material as THREE.MeshBasicMaterial
        material.opacity = t * (0.5 + Math.sin(time * 1.6 + bar.delay * 6) * 0.25)
      })

      billboards.forEach((b) => billboard(b, camera))
    },
    dispose() {
      disposeTree(group)
    },
  }
}
