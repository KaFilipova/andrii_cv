import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, label, ring, solidBox } from '../builders'
import { clamp, easeOutCubic, makeRng } from '../../utils/math'

interface Placement {
  mesh: THREE.Mesh
  pad: THREE.LineLoop
  tag: THREE.Object3D
  height: number
  delay: number
}

const CYCLE = 12

/**
 * A scanned city, and three buildings being placed onto it.
 *
 * The existing fabric is drawn as a point cloud plus dim massing — survey data,
 * not a map tile. The three lit volumes are what the client is asking for:
 * whole buildings, positioned in real coordinates, dropped onto the territory
 * and checked against what the scan says is already there.
 */
export const createLuciad: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)
  const rng = makeRng(2026)

  // ----------------------------------------------------- scanned ground --

  const extent = 34
  const step = 0.42
  const positions: number[] = []
  for (let gx = -extent / 2; gx <= extent / 2; gx += step) {
    for (let gz = -extent / 2; gz <= extent / 2; gz += step) {
      const d = Math.hypot(gx, gz)
      if (d > extent / 2) continue
      const h =
        Math.sin(gx * 0.18) * 0.22 +
        Math.cos(gz * 0.21) * 0.18 +
        (rng() - 0.5) * 0.08
      positions.push(gx, h, gz)
    }
  }
  const scanGeometry = new THREE.BufferGeometry()
  scanGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const scan = new THREE.Points(
    scanGeometry,
    new THREE.PointsMaterial({
      color: PALETTE.steel,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
  group.add(scan)

  // ------------------------------------------------------- existing city --

  const blockGeometry = new THREE.BoxGeometry(1, 1, 1)
  const blockMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.deep,
    roughness: 0.75,
    metalness: 0.1,
  })
  const blockCount = 140
  const city = new THREE.InstancedMesh(blockGeometry, blockMaterial, blockCount)
  const dummy = new THREE.Object3D()
  const reserved: THREE.Vector2[] = [
    new THREE.Vector2(-5.5, -2),
    new THREE.Vector2(0.5, 3.5),
    new THREE.Vector2(6, -3.5),
  ]
  let placed = 0
  let guard = 0
  while (placed < blockCount && guard < blockCount * 12) {
    guard += 1
    const bx = (rng() - 0.5) * 30
    const bz = (rng() - 0.5) * 30
    if (Math.hypot(bx, bz) > 15) continue
    // Keep the three placement plots clear — the scene has to show an empty
    // site before anything is put on it.
    if (reserved.some((r) => Math.abs(r.x - bx) < 4 && Math.abs(r.y - bz) < 4)) continue
    const h = 0.6 + rng() * rng() * 5.4
    const w = 0.9 + rng() * 1.6
    const d = 0.9 + rng() * 1.6
    dummy.position.set(bx, h / 2, bz)
    dummy.scale.set(w, h, d)
    dummy.rotation.y = Math.round(rng() * 4) * (Math.PI / 8)
    dummy.updateMatrix()
    city.setMatrixAt(placed, dummy.matrix)
    placed += 1
  }
  city.count = placed
  city.instanceMatrix.needsUpdate = true
  group.add(city)

  // Thin wire shells over a handful of blocks, so the massing reads as data.
  for (let i = 0; i < 22; i += 1) {
    const bx = (rng() - 0.5) * 26
    const bz = (rng() - 0.5) * 26
    if (reserved.some((r) => Math.abs(r.x - bx) < 4.5 && Math.abs(r.y - bz) < 4.5)) continue
    const h = 0.8 + rng() * 4
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, h, 1.3)),
      new THREE.LineBasicMaterial({ color: PALETTE.steel, transparent: true, opacity: 0.22 }),
    )
    shell.position.set(bx, h / 2, bz)
    group.add(shell)
  }

  // ---------------------------------------------------------- placements --

  const COORDS = ['41.7151° N  44.8271° E', '41.7189° N  44.8094° E', '41.7046° N  44.8333° E']
  const placements: Placement[] = []

  reserved.forEach((plot, i) => {
    const height = [5.6, 7.4, 4.4][i]
    const mesh = solidBox(2.6, height, 2.6, PALETTE.deep, PALETTE.accent)
    mesh.position.set(plot.x, height / 2, plot.y)
    group.add(mesh)

    const pad = ring(2.4, PALETTE.accentWarm, 0.6, 64)
    pad.position.set(plot.x, 0.04, plot.y)
    group.add(pad)

    const tag = new THREE.Group()
    tag.position.set(plot.x, height + 1.3, plot.y)
    group.add(tag)

    const coord = label(COORDS[i], {
      size: 0.26,
      color: PALETTE.accentWarm,
      mono: true,
      letterSpacing: 0.06,
    })
    tag.add(coord)

    const kind = label(['OFFICE · 18 FL', 'TOWER · 24 FL', 'PAVILION · 2 FL'][i], {
      size: 0.19,
      color: PALETTE.steel,
      mono: true,
      letterSpacing: 0.18,
    })
    kind.position.y = -0.33
    tag.add(kind)

    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.55, 0),
        new THREE.Vector3(0, -1.25, 0),
      ]),
      new THREE.LineBasicMaterial({ color: PALETTE.accentWarm, transparent: true, opacity: 0.5 }),
    )
    tag.add(stem)

    placements.push({ mesh, pad, tag, height, delay: i * 0.12 })
  })

  // Scan sweep: a ring that runs out across the site on every cycle.
  const sweep = ring(1, PALETTE.accent, 0.5, 128)
  sweep.position.y = 0.06
  group.add(sweep)

  const caption = label('SCANNED CITY · GEOREFERENCED PLACEMENT', {
    size: 0.26,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.22,
  })
  caption.position.set(0, 0.2, 14)
  caption.rotation.x = -Math.PI / 2.4
  group.add(caption)

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.3)
  group.add(ambient)
  const sun = new THREE.DirectionalLight(PALETTE.ink, 0.72)
  sun.position.set(-8, 14, 6)
  group.add(sun)
  const warm = new THREE.PointLight(PALETTE.accentWarm, 110, 28, 2)
  warm.position.set(2, 7, 2)
  group.add(warm)

  let clock = 0

  return {
    id: 'luciad',
    group,
    bias: 10.0,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(-2, 20, 34)),
      target: anchor.clone().add(new THREE.Vector3(0, 0.5, -2)),
    },
    update({ dt, time, focus, camera }) {
      clock = focus > 0.25 ? (clock + dt) % CYCLE : 0
      const phase = focus > 0.25 ? clock / CYCLE : 1

      const drop = clamp((phase - 0.1) / 0.45, 0, 1)
      const release = clamp((phase - 0.94) / 0.06, 0, 1)

      placements.forEach((p, i) => {
        const local = clamp((drop - p.delay) / 0.55, 0, 1)
        const t = easeOutCubic(local) * (1 - release)
        p.mesh.position.y = p.height / 2 + (1 - t) * 16
        const edge = p.mesh.children[0] as THREE.LineSegments
        const edgeMaterial = edge.material as THREE.LineBasicMaterial
        edgeMaterial.opacity = 0.25 + t * 0.65

        const landed = t > 0.97
        const padMaterial = p.pad.material as THREE.LineBasicMaterial
        padMaterial.opacity = landed ? 0.35 + Math.sin(time * 2.4 + i) * 0.22 : 0.65
        const padScale = landed ? 1 : 1 + (1 - t) * 0.6
        p.pad.scale.setScalar(padScale)

        p.tag.visible = t > 0.99
        billboard(p.tag, camera)
      })

      const sweepT = (phase * 1.0) % 1
      const radius = 1 + sweepT * 16
      sweep.scale.setScalar(radius)
      const sweepMaterial = sweep.material as THREE.LineBasicMaterial
      sweepMaterial.opacity = 0.45 * (1 - sweepT)

      const scanMaterial = scan.material as THREE.PointsMaterial
      scanMaterial.opacity = 0.35 + Math.sin(time * 0.5) * 0.08 + focus * 0.15

      group.rotation.y = Math.sin(time * 0.06) * 0.12 * focus
    },
    dispose() {
      disposeTree(group)
    },
  }
}
