import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, keyLight, label, marker, segment, wireBox } from '../builders'

interface Node {
  group: THREE.Group
  position: THREE.Vector3
  text: THREE.Object3D
}

const STAGES = [
  { name: 'SPEC', note: 'written before any code' },
  { name: 'AGENT', note: 'bounded scope, project rules' },
  { name: 'REVIEW', note: 'mine, line by line' },
  { name: 'SHIP', note: 'and own what it does' },
]

/**
 * How a change actually moves. The loop back from review to spec is the part
 * that matters: an agent that produced something unreviewable sends the spec
 * back, it does not send the branch forward.
 */
export const createHowIWork: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)

  const nodes: Node[] = []
  const billboards: THREE.Object3D[] = []
  const spacing = 3.2

  STAGES.forEach((stage, i) => {
    const x = (i - (STAGES.length - 1) / 2) * spacing
    const node = new THREE.Group()
    node.position.set(x, 0, 0)
    group.add(node)

    const shell = wireBox(1.5, 1.5, 1.5, i === 1 ? PALETTE.accentWarm : PALETTE.accent, 0.5)
    node.add(shell)

    const coreMesh = marker(0.2, i === 1 ? PALETTE.accentWarm : PALETTE.accent, 0.9)
    node.add(coreMesh)

    const name = label(stage.name, {
      size: 0.3,
      color: PALETTE.ink,
      mono: true,
      letterSpacing: 0.22,
    })
    name.position.y = 1.35
    node.add(name)
    billboards.push(name)

    const note = label(stage.note, { size: 0.2, color: PALETTE.steel, maxWidth: 3 })
    note.position.y = -1.35
    node.add(note)
    billboards.push(note)

    nodes.push({ group: node, position: new THREE.Vector3(x, 0, 0), text: name })
  })

  // Forward edges.
  for (let i = 0; i < nodes.length - 1; i += 1) {
    group.add(
      segment(
        nodes[i].position.clone().add(new THREE.Vector3(0.8, 0, 0)),
        nodes[i + 1].position.clone().add(new THREE.Vector3(-0.8, 0, 0)),
        PALETTE.steel,
        0.4,
      ),
    )
  }

  // Feedback edge: review back to spec, drawn as an arc under the line.
  const feedbackCurve = new THREE.CubicBezierCurve3(
    nodes[2].position.clone().add(new THREE.Vector3(0, -0.9, 0)),
    nodes[2].position.clone().add(new THREE.Vector3(-1.5, -3.4, 0)),
    nodes[0].position.clone().add(new THREE.Vector3(1.5, -3.4, 0)),
    nodes[0].position.clone().add(new THREE.Vector3(0, -0.9, 0)),
  )
  const feedback = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(feedbackCurve.getPoints(64)),
    new THREE.LineBasicMaterial({ color: PALETTE.accentWarm, transparent: true, opacity: 0.45 }),
  )
  group.add(feedback)

  const feedbackLabel = label('not good enough → back to the spec', {
    size: 0.2,
    color: PALETTE.accentWarm,
  })
  feedbackLabel.position.set(-1.8, -3.9, 0)
  group.add(feedbackLabel)
  billboards.push(feedbackLabel)

  const forwardPulse = marker(0.11, PALETTE.accent)
  group.add(forwardPulse)

  const feedbackPulse = marker(0.09, PALETTE.accentWarm)
  group.add(feedbackPulse)

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.5)
  group.add(ambient)
  keyLight(group, 0.9, 2, 7, 8)

  const start = nodes[0].position.x
  const end = nodes[nodes.length - 1].position.x
  let t = 0
  let feedbackT = 0

  return {
    id: 'howiwork',
    group,
    bias: 7.2,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0, 2.6, 21)),
      target: anchor.clone().add(new THREE.Vector3(0, -0.8, 0)),
    },
    update({ dt, time, focus, camera }) {
      t = (t + dt * 0.22) % 1
      forwardPulse.position.set(THREE.MathUtils.lerp(start, end, t), 0, 0)
      const pulseMaterial = forwardPulse.material as THREE.MeshBasicMaterial
      pulseMaterial.opacity = 0.4 + Math.sin(t * Math.PI) * 0.6

      feedbackT = (feedbackT + dt * 0.14) % 1
      feedbackCurve.getPoint(feedbackT, feedbackPulse.position)

      nodes.forEach((node, i) => {
        const centre = (i / (nodes.length - 1)) * 0.94 + 0.03
        const near = 1 - Math.min(1, Math.abs(t - centre) * 7)
        node.group.scale.setScalar(1 + near * 0.12 * focus)
        const shell = node.group.children[0] as THREE.LineSegments
        const material = shell.material as THREE.LineBasicMaterial
        material.opacity = 0.35 + near * 0.55
        node.group.rotation.y = time * 0.12 + i
      })

      billboards.forEach((b) => billboard(b, camera))
    },
    dispose() {
      disposeTree(group)
    },
  }
}
