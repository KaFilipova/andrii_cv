import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, keyLight, label, marker, segment } from '../builders'

interface Layer {
  slab: THREE.Mesh
  edge: THREE.LineSegments
  y: number
  index: number
}

const LAYERS = [
  { name: 'ui', note: 'React panels, rails, dialogs' },
  { name: 'render', note: 'three.js — draws the document' },
  { name: 'state', note: 'zustand — what is open, selected, staged' },
  { name: 'api', note: 'payloads in, PATCH bodies out' },
  { name: 'domain', note: 'pure rules — no React, no three.js' },
]

/**
 * The builder's five layers, stacked, with the dependency arrow drawn as a
 * pulse that only ever travels one way. The bottom slab is the one that can be
 * tested without a browser, so it is the one that is lit.
 */
export const createTradeoffs: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const layers: Layer[] = []
  const billboards: THREE.Object3D[] = []
  const gap = 1.5
  const width = 6.2
  const depth = 3.8

  LAYERS.forEach((spec, i) => {
    const y = (LAYERS.length - 1 - i) * gap
    const isDomain = spec.name === 'domain'
    const color = isDomain ? PALETTE.accent : PALETTE.steel

    const geometry = new THREE.BoxGeometry(width, 0.14, depth)
    const slab = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: isDomain ? PALETTE.deep : PALETTE.bg,
        roughness: 0.5,
        metalness: 0.3,
        transparent: true,
        opacity: 0.92,
      }),
    )
    slab.position.y = y
    group.add(slab)

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: isDomain ? 0.9 : 0.45,
        depthWrite: false,
      }),
    )
    edge.position.y = y
    group.add(edge)

    const name = label(spec.name, {
      size: 0.34,
      color: isDomain ? PALETTE.accent : PALETTE.ink,
      mono: true,
      letterSpacing: 0.2,
      anchorX: 'left',
    })
    name.position.set(-width / 2 + 0.3, y + 0.68, depth / 2 + 0.1)
    group.add(name)
    billboards.push(name)

    const note = label(spec.note, {
      size: 0.21,
      color: PALETTE.steel,
      anchorX: 'left',
    })
    note.position.set(-width / 2 + 0.3, y + 0.36, depth / 2 + 0.1)
    group.add(note)
    billboards.push(note)

    layers.push({ slab, edge, y, index: i })
  })

  // The arrow: one rail down the side, travelled by a single pulse.
  const top = (LAYERS.length - 1) * gap
  const railX = width / 2 + 0.8
  group.add(
    segment(
      new THREE.Vector3(railX, top, 0),
      new THREE.Vector3(railX, 0, 0),
      PALETTE.accent,
      0.35,
    ),
  )

  const pulse = marker(0.13, PALETTE.accentWarm)
  pulse.position.set(railX, top, 0)
  group.add(pulse)

  const arrowLabel = label('DEPENDS ON', {
    size: 0.2,
    color: PALETTE.accentWarm,
    mono: true,
    letterSpacing: 0.24,
  })
  arrowLabel.position.set(railX + 1.5, top / 2, 0)
  group.add(arrowLabel)
  billboards.push(arrowLabel)

  const guard = label('↓ one way, never back up', {
    size: 0.18,
    color: PALETTE.steel,
  })
  guard.position.set(railX + 1.5, top / 2 - 0.36, 0)
  group.add(guard)
  billboards.push(guard)

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.55)
  group.add(ambient)
  keyLight(group, 1.05, -4, 9, 8)

  let travel = 0

  return {
    id: 'tradeoffs',
    group,
    bias: -7.5,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(1.0, 6.4, 22)),
      target: anchor.clone().add(new THREE.Vector3(0, 3.0, 0)),
    },
    update({ dt, time, focus, camera }) {
      travel = (travel + dt * (0.22 + focus * 0.2)) % 1
      const y = top * (1 - travel)
      pulse.position.y = y

      layers.forEach((layer) => {
        // A slab lights as the pulse passes it: the dependency arriving.
        const near = 1 - Math.min(1, Math.abs(layer.y - y) / 1.1)
        const material = layer.edge.material as THREE.LineBasicMaterial
        const base = layer.index === LAYERS.length - 1 ? 0.9 : 0.4
        material.opacity = base + near * 0.5
        layer.slab.position.y = layer.y + Math.sin(time * 0.6 + layer.index) * 0.03 * focus
        layer.edge.position.y = layer.slab.position.y
      })

      billboards.forEach((b) => billboard(b, camera))
    },
    dispose() {
      disposeTree(group)
    },
  }
}
