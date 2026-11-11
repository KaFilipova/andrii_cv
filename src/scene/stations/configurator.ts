import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, gridFloor, keyLight, label, marker, solidBox, wireBox } from '../builders'
import { clamp, easeOutCubic, makeRng } from '../../utils/math'

interface Part {
  mesh: THREE.Object3D
  home: THREE.Vector3
  away: THREE.Vector3
  spin: THREE.Euler
  order: number
  price: number
  ports: THREE.Mesh[]
}

const CYCLE = 11

/**
 * The trade-fair stand, assembling itself on a loop.
 *
 * Parts leave their exploded pose in catalogue order, travel to the pose the
 * document gives them, and light their ports as they seat. The running total
 * climbs with them — the point being that the geometry and the price come from
 * the same edit, not from two passes.
 */
export const createConfigurator: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const floor = gridFloor(44, 22, 0.13)
  group.add(floor)

  const stand = new THREE.Group()
  stand.position.y = 0.05
  group.add(stand)

  const parts: Part[] = []
  const rng = makeRng(42)

  const addPart = (
    mesh: THREE.Object3D,
    home: THREE.Vector3,
    order: number,
    price: number,
    portOffsets: THREE.Vector3[],
  ) => {
    mesh.position.copy(home)
    const away = home
      .clone()
      .add(
        new THREE.Vector3((rng() - 0.5) * 5, 1.8 + rng() * 3, (rng() - 0.5) * 5),
      )
    const ports = portOffsets.map((offset) => {
      const port = marker(0.075, PALETTE.accentWarm, 0)
      port.position.copy(offset)
      mesh.add(port)
      return port
    })
    stand.add(mesh)
    parts.push({
      mesh,
      home,
      away,
      spin: new THREE.Euler((rng() - 0.5) * 1.4, (rng() - 0.5) * 2.2, (rng() - 0.5) * 1.4),
      order,
      price,
      ports,
    })
  }

  // Deck
  const deck = solidBox(7.4, 0.16, 5.4, PALETTE.deep, PALETTE.steel)
  addPart(deck, new THREE.Vector3(0, 0.08, 0), 0, 1850, [])

  // Four posts
  const postPositions: [number, number][] = [
    [-3.4, -2.4],
    [3.4, -2.4],
    [-3.4, 2.4],
    [3.4, 2.4],
  ]
  postPositions.forEach(([px, pz], i) => {
    const post = solidBox(0.22, 3.6, 0.22, PALETTE.deep, PALETTE.accent)
    addPart(post, new THREE.Vector3(px, 1.96, pz), 1 + i * 0.12, 420, [
      new THREE.Vector3(0, -1.8, 0),
      new THREE.Vector3(0, 1.8, 0),
    ])
  })

  // Beams across the top
  const beamSpecs: { size: [number, number, number]; pos: [number, number, number] }[] = [
    { size: [7.0, 0.18, 0.18], pos: [0, 3.68, -2.4] },
    { size: [7.0, 0.18, 0.18], pos: [0, 3.68, 2.4] },
    { size: [0.18, 0.18, 5.0], pos: [-3.4, 3.68, 0] },
    { size: [0.18, 0.18, 5.0], pos: [3.4, 3.68, 0] },
  ]
  beamSpecs.forEach((spec, i) => {
    const beam = solidBox(spec.size[0], spec.size[1], spec.size[2], PALETTE.deep, PALETTE.accent)
    addPart(beam, new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]), 2 + i * 0.1, 310, [
      new THREE.Vector3(spec.size[0] > 1 ? -spec.size[0] / 2 : 0, 0, spec.size[2] > 1 ? -spec.size[2] / 2 : 0),
      new THREE.Vector3(spec.size[0] > 1 ? spec.size[0] / 2 : 0, 0, spec.size[2] > 1 ? spec.size[2] / 2 : 0),
    ])
  })

  // Back wall panels
  for (let i = 0; i < 3; i += 1) {
    const panel = solidBox(2.3, 3.2, 0.1, PALETTE.deep, PALETTE.steel)
    addPart(panel, new THREE.Vector3(-2.35 + i * 2.35, 1.95, -2.45), 3 + i * 0.14, 640, [
      new THREE.Vector3(-1.1, 1.5, 0),
      new THREE.Vector3(1.1, -1.5, 0),
    ])
  }

  // Shelves on the back wall
  for (let i = 0; i < 3; i += 1) {
    const shelf = solidBox(2.0, 0.09, 0.55, PALETTE.deep, PALETTE.accentWarm)
    addPart(shelf, new THREE.Vector3(-2.35 + i * 2.35, 1.0 + (i % 2) * 0.95, -2.1), 4.2 + i * 0.16, 290, [
      new THREE.Vector3(0, 0, -0.26),
    ])
  }

  // Counter
  const counter = solidBox(1.9, 1.05, 0.9, PALETTE.deep, PALETTE.accent)
  addPart(counter, new THREE.Vector3(2.0, 0.6, 1.4), 5.3, 1240, [new THREE.Vector3(0, -0.5, 0)])

  // Fascia
  const fascia = solidBox(7.0, 0.7, 0.1, PALETTE.deep, PALETTE.accentWarm)
  addPart(fascia, new THREE.Vector3(0, 4.1, -2.45), 5.9, 760, [
    new THREE.Vector3(-3.4, -0.3, 0),
    new THREE.Vector3(3.4, -0.3, 0),
  ])

  // Booth envelope: the volume the dealer rented.
  const envelope = wireBox(8.2, 4.8, 6.2, PALETTE.accent, 0.12)
  envelope.position.y = 2.4
  group.add(envelope)

  const envelopeLabel = label('BOOTH 8.0 × 6.0 m', {
    size: 0.26,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.16,
  })
  envelopeLabel.position.set(0, -0.55, 3.2)
  group.add(envelopeLabel)

  const totalValue = label('€ 0', { size: 0.62, color: PALETTE.accent })
  totalValue.position.set(0, 6.4, 0)
  group.add(totalValue)

  const totalCaption = label('RUNNING TOTAL · UPDATED IN THE SAME FRAME', {
    size: 0.18,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.2,
  })
  totalCaption.position.set(0, 5.95, 0)
  group.add(totalCaption)

  const billboards = [envelopeLabel, totalValue, totalCaption]

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.55)
  group.add(ambient)
  keyLight(group, 1.9, 6, 11, 8)
  const warm = new THREE.PointLight(PALETTE.accentWarm, 90, 26, 2)
  warm.position.set(-5, 3, 5)
  group.add(warm)

  const maxOrder = parts.reduce((m, p) => Math.max(m, p.order), 0)
  let clock = 0
  let shownTotal = -1

  return {
    id: 'configurator',
    group,
    bias: -6.8,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(5.5, 7.5, 20)),
      target: anchor.clone().add(new THREE.Vector3(0, 2.2, 0)),
    },
    update({ dt, time, focus, camera }) {
      // The loop only runs while the station is in view; off-camera it holds
      // assembled so a jump back never lands mid-explosion.
      clock = focus > 0.25 ? (clock + dt) % CYCLE : 0
      const phase = focus > 0.25 ? clock / CYCLE : 1

      // 0 → 0.08 exploded, 0.08 → 0.72 assembling, hold, 0.92 → 1 release
      const assemble = clamp((phase - 0.08) / 0.64, 0, 1)
      const release = clamp((phase - 0.92) / 0.08, 0, 1)

      let total = 0

      parts.forEach((part) => {
        const start = (part.order / (maxOrder + 1.4)) * 0.82
        const local = clamp((assemble - start) / 0.18, 0, 1)
        const seated = easeOutCubic(local)
        const back = release

        const t = seated * (1 - back)
        part.mesh.position.lerpVectors(part.away, part.home, t)
        part.mesh.rotation.set(
          part.spin.x * (1 - t),
          part.spin.y * (1 - t),
          part.spin.z * (1 - t),
        )

        if (t > 0.985) total += part.price

        // A port is lit for the moment the joint closes, then fades: the same
        // feedback the real builder gives when a placement is accepted.
        const flash = Math.max(0, 1 - Math.abs(local - 1) * 7) * (1 - back)
        part.ports.forEach((port) => {
          const pm = port.material as THREE.MeshBasicMaterial
          pm.opacity = flash * 0.95
          const s = 1 + flash * 1.6
          port.scale.setScalar(s)
        })
      })

      if (total !== shownTotal) {
        shownTotal = total
        const text = totalValue as unknown as { text: string; sync: () => void }
        text.text = `€ ${total.toLocaleString('en-US')}`
        text.sync()
      }

      stand.rotation.y = Math.sin(time * 0.12) * 0.26 * focus
      envelope.rotation.y = stand.rotation.y
      billboards.forEach((b) => billboard(b, camera))
    },
    dispose() {
      disposeTree(group)
    },
  }
}
