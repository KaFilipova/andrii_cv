import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, gridFloor, keyLight, label, marker, solidBox, wireBox } from '../builders'
import { clamp, easeInOutCubic, makeRng } from '../../utils/math'

const CYCLE = 6.5

/**
 * The two earlier real-time jobs, side by side.
 *
 * Left: the fuse-assembly arm. It picks from the tray and seats a fuse in the
 * board on a loop — the same motion the operator interface had to mirror,
 * driven over a socket rather than guessed from a timer.
 *
 * Right: the monitoring wall. Nine of thirty tiles, because thirty on screen is
 * the fact and nine is the picture.
 */
export const createRealtime: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)
  const rng = makeRng(99)

  group.add(gridFloor(40, 20, 0.12))

  // ------------------------------------------------------------- the arm --

  const cell = new THREE.Group()
  cell.position.set(-3.3, 0, 0)
  group.add(cell)

  const plinth = solidBox(2.4, 0.4, 2.4, PALETTE.deep, PALETTE.steel)
  plinth.position.y = 0.2
  cell.add(plinth)

  const column = new THREE.Group()
  column.position.y = 0.4
  cell.add(column)

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.52, 0.8, 20),
    new THREE.MeshStandardMaterial({ color: PALETTE.deep, roughness: 0.5, metalness: 0.5 }),
  )
  base.position.y = 0.4
  column.add(base)

  const shoulder = new THREE.Group()
  shoulder.position.y = 0.8
  column.add(shoulder)

  const upperArm = solidBox(0.26, 2.4, 0.26, PALETTE.deep, PALETTE.accent)
  upperArm.position.y = 1.2
  shoulder.add(upperArm)

  const elbow = new THREE.Group()
  elbow.position.y = 2.4
  shoulder.add(elbow)

  const foreArm = solidBox(0.22, 1.9, 0.22, PALETTE.deep, PALETTE.accent)
  foreArm.position.y = 0.95
  elbow.add(foreArm)

  const wrist = new THREE.Group()
  wrist.position.y = 1.9
  elbow.add(wrist)

  const gripper = solidBox(0.4, 0.26, 0.4, PALETTE.deep, PALETTE.accentWarm)
  wrist.add(gripper)

  const held = solidBox(0.3, 0.3, 0.18, PALETTE.deep, PALETTE.accentWarm)
  held.position.y = -0.3
  wrist.add(held)

  // Tray of fuses and the board they go into.
  const tray = wireBox(1.5, 0.3, 1.0, PALETTE.steel, 0.4)
  tray.position.set(-1.3, 0.55, 0.9)
  cell.add(tray)

  const board = solidBox(2.2, 0.12, 1.2, PALETTE.deep, PALETTE.steel)
  board.position.set(1.4, 0.46, -0.3)
  cell.add(board)

  const slots: THREE.Mesh[] = []
  for (let i = 0; i < 6; i += 1) {
    const slot = marker(0.07, PALETTE.steel, 0.5)
    slot.position.set(1.4 - 0.75 + (i % 3) * 0.75, 0.56, -0.3 - 0.25 + Math.floor(i / 3) * 0.5)
    cell.add(slot)
    slots.push(slot)
  }

  const link = label('WEBSOCKET · 60 Hz STATE', {
    size: 0.2,
    color: PALETTE.accent,
    mono: true,
    letterSpacing: 0.2,
  })
  link.position.set(0, 5.6, 0)
  cell.add(link)

  // ------------------------------------------------------ monitoring wall --

  const wall = new THREE.Group()
  wall.position.set(3.6, 2.8, -1.0)
  wall.rotation.y = -0.34
  group.add(wall)

  interface Tile {
    mesh: THREE.Mesh
    scan: THREE.Mesh
    seed: number
  }
  const tiles: Tile[] = []
  const tileW = 1.5
  const tileH = 1.0
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(tileW, tileH),
        new THREE.MeshBasicMaterial({
          color: PALETTE.deep,
          transparent: true,
          opacity: 0.85,
          toneMapped: false,
        }),
      )
      mesh.position.set((col - 1) * (tileW + 0.12), (1 - row) * (tileH + 0.12), 0)
      wall.add(mesh)

      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(tileW, tileH)),
        new THREE.LineBasicMaterial({ color: PALETTE.steel, transparent: true, opacity: 0.5 }),
      )
      frame.position.copy(mesh.position)
      wall.add(frame)

      const scan = new THREE.Mesh(
        new THREE.PlaneGeometry(tileW, 0.06),
        new THREE.MeshBasicMaterial({
          color: PALETTE.accent,
          transparent: true,
          opacity: 0.5,
          toneMapped: false,
        }),
      )
      scan.position.copy(mesh.position)
      scan.position.z = 0.01
      wall.add(scan)

      tiles.push({ mesh, scan, seed: rng() * 10 })
    }
  }

  const wallLabel = label('30 SIMULTANEOUS FEEDS · WebRTC', {
    size: 0.22,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.2,
  })
  wallLabel.position.set(0, -2.1, 0)
  wall.add(wallLabel)

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.5)
  group.add(ambient)
  keyLight(group, 1.1, -3, 9, 8)

  let clock = 0

  return {
    id: 'realtime',
    group,
    bias: -6.4,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0.8, 5.4, 19.5)),
      target: anchor.clone().add(new THREE.Vector3(0, 2.2, 0)),
    },
    update({ dt, time, focus, camera }) {
      clock = (clock + dt * (focus > 0.2 ? 1 : 0.25)) % CYCLE
      const phase = clock / CYCLE

      // Pick (0 → .3), travel (.3 → .6), seat (.6 → .78), return (.78 → 1)
      const reachTray = easeInOutCubic(clamp(phase / 0.3, 0, 1))
      const travel = easeInOutCubic(clamp((phase - 0.3) / 0.3, 0, 1))
      const seat = easeInOutCubic(clamp((phase - 0.6) / 0.18, 0, 1))
      const back = easeInOutCubic(clamp((phase - 0.78) / 0.22, 0, 1))

      const swing = THREE.MathUtils.lerp(-0.85, 0.75, travel) * (1 - back) + back * -0.85
      column.rotation.y = swing

      const reach = reachTray * (1 - travel) + travel * 0.7
      shoulder.rotation.x = -0.45 - reach * 0.5 + seat * 0.26 - back * 0.4
      elbow.rotation.x = 0.9 + reach * 0.5 - seat * 0.3 + back * 0.3
      wrist.rotation.x = -shoulder.rotation.x - elbow.rotation.x

      const carrying = phase > 0.28 && phase < 0.72
      held.visible = carrying
      const heldMaterial = held.material as THREE.MeshStandardMaterial
      heldMaterial.opacity = 1

      const seatedIndex = Math.floor(phase * 6) % 6
      slots.forEach((slot, i) => {
        const material = slot.material as THREE.MeshBasicMaterial
        const on = i <= seatedIndex && seat > 0.5
        material.color.copy(on ? PALETTE.accentWarm : PALETTE.steel)
        material.opacity = on ? 0.95 : 0.4
      })

      billboard(link, camera)
      billboard(wallLabel, camera)

      tiles.forEach((tile, i) => {
        const t = (time * (0.35 + (i % 4) * 0.08) + tile.seed) % 1
        tile.scan.position.y = tile.mesh.position.y + (0.5 - t) * tileH
        const scanMaterial = tile.scan.material as THREE.MeshBasicMaterial
        scanMaterial.opacity = 0.22 + Math.sin(t * Math.PI) * 0.35
        const meshMaterial = tile.mesh.material as THREE.MeshBasicMaterial
        meshMaterial.opacity = 0.6 + Math.sin(time * 1.7 + tile.seed) * 0.12
      })
    },
    dispose() {
      disposeTree(group)
    },
  }
}
