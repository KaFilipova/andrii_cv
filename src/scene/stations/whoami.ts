import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, gridFloor, keyLight, label, solidBox, wireBox } from '../builders'

interface Monolith {
  group: THREE.Group
  sweep: THREE.Mesh
  height: number
  offset: number
}

/**
 * Three monoliths, one per claim on the slide. Height encodes nothing — they
 * are a frame for the copy, and the scan sweep is there to keep the eye moving
 * while the speaker talks.
 */
export const createWhoAmI: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const floor = gridFloor(60, 30, 0.14)
  group.add(floor)

  const specs: { height: number; captionTop: string; captionBottom: string }[] = [
    { height: 7.2, captionTop: '5+', captionBottom: 'YEARS' },
    { height: 5.4, captionTop: '3', captionBottom: 'LEAD ROLES' },
    { height: 6.3, captionTop: '2', captionBottom: 'ECOSYSTEMS' },
  ]

  const monoliths: Monolith[] = []

  specs.forEach((spec, i) => {
    const column = new THREE.Group()
    column.position.set((i - 1) * 3.4, 0, i === 1 ? 1.6 : 0)

    const body = solidBox(1.7, spec.height, 1.7, PALETTE.deep, PALETTE.steel)
    body.position.y = spec.height / 2
    column.add(body)

    const cage = wireBox(2.1, spec.height + 0.5, 2.1, PALETTE.accent, 0.16)
    cage.position.y = (spec.height + 0.5) / 2
    column.add(cage)

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.09, 1.9),
      new THREE.MeshBasicMaterial({ color: PALETTE.accent, toneMapped: false }),
    )
    cap.position.y = spec.height + 0.1
    column.add(cap)

    const sweep = new THREE.Mesh(
      new THREE.BoxGeometry(1.84, 0.035, 1.84),
      new THREE.MeshBasicMaterial({
        color: PALETTE.accentWarm,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      }),
    )
    sweep.position.y = 0.2
    column.add(sweep)

    const top = label(spec.captionTop, { size: 0.74, color: PALETTE.ink })
    top.position.set(0, spec.height + 1.1, 1.1)
    column.add(top)

    const bottom = label(spec.captionBottom, {
      size: 0.21,
      color: PALETTE.steel,
      mono: true,
      letterSpacing: 0.22,
    })
    bottom.position.set(0, spec.height + 0.58, 1.1)
    column.add(bottom)

    group.add(column)
    monoliths.push({ group: column, sweep, height: spec.height, offset: i * 0.7 })
  })

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.55)
  group.add(ambient)
  keyLight(group, 1.1, 4, 9, 7)
  const fill = new THREE.PointLight(PALETTE.accentWarm, 60, 30, 2)
  fill.position.set(-5, 2.5, 4)
  group.add(fill)

  return {
    id: 'whoami',
    group,
    bias: 5.2,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0.5, 6.0, 17.5)),
      target: anchor.clone().add(new THREE.Vector3(0, 3.6, 0)),
    },
    update({ time, focus, camera }) {
      monoliths.forEach((m) => {
        const t = (time * 0.32 + m.offset) % 1.6
        const y = (t / 1.6) * m.height
        m.sweep.position.y = y
        const material = m.sweep.material as THREE.MeshBasicMaterial
        material.opacity = 0.75 * Math.sin((y / m.height) * Math.PI) * (0.35 + focus * 0.65)
        m.group.position.y = Math.sin(time * 0.5 + m.offset) * 0.07 * focus
        m.group.children.forEach((child) => {
          if ((child as { isTroikaText?: boolean }).isTroikaText) billboard(child, camera)
        })
      })
    },
    dispose() {
      disposeTree(group)
    },
  }
}
