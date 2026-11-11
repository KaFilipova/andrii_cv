import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, label, marker, segment, solidBox, wireBox } from '../builders'
import { clamp, easeInOutCubic } from '../../utils/math'

const CYCLE = 9.5

// Short on purpose: this label sits under the demo and has to stay inside the
// subject's half of the screen. The full sentence is on the slide.
const PHASES = ['1 · TURN', '2 · TWIST', '3 · SLIDE', 'SEATED']

/**
 * Two demonstrations side by side, because the two rules answer two different
 * questions.
 *
 * Left: how a joint is made — turn, twist, slide, in that order, which is the
 * mating rule stated as motion.
 *
 * Right: why touching is not colliding — a part slides flush against another
 * and stays legal, then penetrates and does not.
 */
export const createMechanics: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  // ---------------------------------------------------------------- mating --

  const mating = new THREE.Group()
  mating.position.set(-3.0, 0, 0)
  group.add(mating)

  const socket = solidBox(2.4, 2.4, 1.2, PALETTE.deep, PALETTE.steel)
  mating.add(socket)

  const socketPorts: THREE.Mesh[] = []
  const socketOffsets = [
    new THREE.Vector3(-0.7, 0.7, 0.62),
    new THREE.Vector3(0.7, 0.7, 0.62),
    new THREE.Vector3(-0.7, -0.7, 0.62),
    new THREE.Vector3(0.7, -0.7, 0.62),
  ]
  socketOffsets.forEach((offset) => {
    const port = marker(0.11, PALETTE.steel, 0.85)
    port.position.copy(offset)
    socket.add(port)
    socketPorts.push(port)
  })

  const socketFace = wireBox(2.0, 2.0, 0.02, PALETTE.steel, 0.4)
  socketFace.position.z = 0.63
  socket.add(socketFace)

  const plug = solidBox(1.6, 1.6, 1.0, PALETTE.deep, PALETTE.accent)
  mating.add(plug)

  const plugPorts: THREE.Mesh[] = []
  const plugOffsets = [
    new THREE.Vector3(-0.7, 0.7, -0.52),
    new THREE.Vector3(0.7, 0.7, -0.52),
    new THREE.Vector3(-0.7, -0.7, -0.52),
    new THREE.Vector3(0.7, -0.7, -0.52),
  ]
  plugOffsets.forEach((offset, i) => {
    // The keyed port is the one that fixes rotation; it is drawn differently
    // so the twist phase has something to land on.
    const port = marker(i === 0 ? 0.15 : 0.11, i === 0 ? PALETTE.accentWarm : PALETTE.accent, 0.95)
    port.position.copy(offset)
    plug.add(port)
    plugPorts.push(port)
  })

  const keyAxis = segment(
    new THREE.Vector3(-0.7, 0.7, -0.52),
    new THREE.Vector3(-0.7, 0.7, -1.3),
    PALETTE.accentWarm,
    0.7,
  )
  plug.add(keyAxis)

  const phaseText = label(PHASES[0], { size: 0.3, color: PALETTE.accent, mono: true, letterSpacing: 0.1 })
  phaseText.position.set(0, -2.3, 0)
  mating.add(phaseText)

  const matingCaption = label('PORT MATING', {
    size: 0.2,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.26,
  })
  matingCaption.position.set(0, 2.5, 0)
  mating.add(matingCaption)

  // ------------------------------------------------------------- collision --

  const collision = new THREE.Group()
  collision.position.set(2.9, 0, 0)
  group.add(collision)

  const anchorBlock = solidBox(2.6, 2.0, 1.6, PALETTE.deep, PALETTE.steel)
  collision.add(anchorBlock)

  const prober = solidBox(1.2, 1.2, 1.2, PALETTE.deep, PALETTE.accent)
  collision.add(prober)

  const proberEdge = prober.children[0] as THREE.LineSegments
  const proberEdgeMaterial = proberEdge.material as THREE.LineBasicMaterial
  proberEdgeMaterial.opacity = 0.95

  const verdict = label('FLUSH — ACCEPTED', {
    size: 0.26,
    color: PALETTE.accent,
    mono: true,
    letterSpacing: 0.1,
  })
  verdict.position.set(0, -2.3, 0)
  collision.add(verdict)

  const collisionCaption = label('PENETRATION TEST', {
    size: 0.2,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.26,
  })
  collisionCaption.position.set(0, 2.5, 0)
  collision.add(collisionCaption)

  const epsilonGuide = wireBox(2.64, 2.04, 1.64, PALETTE.steel, 0.25)
  collision.add(epsilonGuide)

  const billboards = [phaseText, matingCaption, verdict, collisionCaption]

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.5)
  group.add(ambient)
  const key = new THREE.DirectionalLight(PALETTE.ink, 1.1)
  key.position.set(3, 8, 9)
  group.add(key)

  let clock = 0
  let shownPhase = -1
  let shownVerdict = ''

  const setText = (object: THREE.Object3D, value: string, color: THREE.Color) => {
    const text = object as unknown as { text: string; color: THREE.Color; sync: () => void }
    text.text = value
    text.color = color
    text.sync()
  }

  return {
    id: 'mechanics',
    group,
    bias: 5.4,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0.2, 3.0, 17.5)),
      target: anchor.clone().add(new THREE.Vector3(0.2, 0.1, 0)),
    },
    update({ dt, focus, camera }) {
      clock = focus > 0.25 ? (clock + dt) % CYCLE : clock
      const phase = clock / CYCLE

      // --- mating: four quarters of the loop, one per phase of the rule ---
      let phaseIndex = 0
      let yaw = Math.PI * 0.75
      let roll = 0.9
      let z = 3.4

      if (phase < 0.3) {
        const t = easeInOutCubic(phase / 0.3)
        phaseIndex = 0
        yaw = Math.PI * 0.75 * (1 - t)
        roll = 0.9
        z = 3.4
      } else if (phase < 0.55) {
        const t = easeInOutCubic((phase - 0.3) / 0.25)
        phaseIndex = 1
        yaw = 0
        roll = 0.9 * (1 - t)
        z = 3.4
      } else if (phase < 0.8) {
        const t = easeInOutCubic((phase - 0.55) / 0.25)
        phaseIndex = 2
        yaw = 0
        roll = 0
        z = 3.4 - t * 2.26
      } else {
        phaseIndex = 3
        yaw = 0
        roll = 0
        z = 1.14
      }

      plug.rotation.set(0, yaw, roll)
      plug.position.z = z

      const seated = phaseIndex === 3
      plugPorts.forEach((port, i) => {
        const material = port.material as THREE.MeshBasicMaterial
        material.color.copy(seated ? PALETTE.accentWarm : i === 0 ? PALETTE.accentWarm : PALETTE.accent)
        port.scale.setScalar(seated ? 1.35 : 1)
      })
      socketPorts.forEach((port) => {
        const material = port.material as THREE.MeshBasicMaterial
        material.color.copy(seated ? PALETTE.accentWarm : PALETTE.steel)
      })

      if (phaseIndex !== shownPhase) {
        shownPhase = phaseIndex
        setText(phaseText, PHASES[phaseIndex], seated ? PALETTE.accentWarm : PALETTE.accent)
      }

      // --- collision: approach, rest flush, then push through ---
      const cycle = phase
      const flushX = 1.9 // faces touching exactly
      let x = flushX
      if (cycle < 0.35) {
        x = flushX + (1 - easeInOutCubic(cycle / 0.35)) * 1.2
      } else if (cycle < 0.6) {
        x = flushX
      } else if (cycle < 0.8) {
        x = flushX - easeInOutCubic((cycle - 0.6) / 0.2) * 0.75
      } else {
        x = flushX - 0.75 + easeInOutCubic((cycle - 0.8) / 0.2) * 0.75
      }
      prober.position.x = x

      // The policy, in one line: overlap on every axis by more than the flush
      // tolerance. Touching produces an overlap of zero, so it stays legal.
      const overlapX = 2.6 / 2 + 1.2 / 2 - Math.abs(x)
      const epsilon = 0.02
      const penetrating = overlapX > epsilon
      const color = penetrating ? PALETTE.alert : PALETTE.accent
      proberEdgeMaterial.color.copy(color)
      epsilonGuide.visible = clamp(overlapX, -1, 1) > -0.08

      const verdictText = penetrating
        ? `PENETRATION ${overlapX.toFixed(2)} m — REJECTED`
        : overlapX > -epsilon
          ? 'FLUSH — ACCEPTED'
          : 'CLEAR'
      if (verdictText !== shownVerdict) {
        shownVerdict = verdictText
        setText(verdict, verdictText, color)
      }

      billboards.forEach((b) => billboard(b, camera))
    },
    dispose() {
      disposeTree(group)
    },
  }
}
