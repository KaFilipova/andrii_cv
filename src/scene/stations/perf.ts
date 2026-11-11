import * as THREE from 'three'
import type { StationFactory } from '../types'
import { PALETTE } from '../palette'
import { billboard, disposeTree, label } from '../builders'
import { clamp, makeRng } from '../../utils/math'

/** Objects in the field. Large enough that the point being made is not rhetorical. */
const COUNT = 2200
/** Half-angle of the sweeping view wedge, radians. */
const HALF_ANGLE = 0.42
const EXTENT = 26

interface Cost {
  key: string
  ms: number
  color: THREE.Color
}

interface Budget extends Cost {
  mesh: THREE.Mesh
  tag: THREE.Object3D
}

/**
 * Where a frame goes, and what is paid for.
 *
 * One InstancedMesh holds every object in the field, so the whole scene is a
 * single draw call however many boxes are in it. A view wedge sweeps the field
 * and only what falls inside it is shaded as drawn — the rest stays dark. The
 * readout above counts the two numbers that actually matter in a large scene:
 * how much is in it, and how little of that the GPU was asked to touch.
 *
 * The bar in front is a 16.6 ms frame budget split into the four costs this
 * deck's own stations pay. It is the slide's claim made literal: optimisation
 * is knowing which of those four segments is the long one before touching code.
 */
export const createPerf: StationFactory = (anchor) => {
  const group = new THREE.Group()
  group.position.copy(anchor)
  const rng = makeRng(90210)

  // ------------------------------------------------------------- the field --

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.ink,
    roughness: 0.62,
    metalness: 0.12,
  })
  const field = new THREE.InstancedMesh(geometry, material, COUNT)
  field.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

  // Per-instance angle is cached once: the sweep test is then a scalar compare
  // per object per frame, not a matrix decompose. The same reason the real
  // thing keeps a flat array beside the scene graph.
  const angles = new Float32Array(COUNT)
  const dummy = new THREE.Object3D()
  const dim = PALETTE.deep.clone()
  const lit = PALETTE.accent.clone()
  const edge = PALETTE.accentWarm.clone()

  for (let i = 0; i < COUNT; i += 1) {
    const radius = Math.sqrt(rng()) * (EXTENT / 2)
    const theta = rng() * Math.PI * 2
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius
    const h = 0.4 + rng() * rng() * 6.2
    dummy.position.set(x, h / 2, z)
    dummy.scale.set(0.5 + rng() * 0.7, h, 0.5 + rng() * 0.7)
    dummy.rotation.y = rng() * Math.PI
    dummy.updateMatrix()
    field.setMatrixAt(i, dummy.matrix)
    field.setColorAt(i, dim)
    angles[i] = Math.atan2(z, x)
  }
  field.instanceMatrix.needsUpdate = true
  group.add(field)

  // --------------------------------------------------------- the view wedge --

  const wedge = new THREE.Group()
  group.add(wedge)

  const reach = EXTENT / 2 + 1
  const arcPoints: THREE.Vector3[] = []
  for (let i = 0; i <= 24; i += 1) {
    const a = -HALF_ANGLE + (i / 24) * HALF_ANGLE * 2
    arcPoints.push(new THREE.Vector3(Math.cos(a) * reach, 0.05, Math.sin(a) * reach))
  }
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.05, 0),
      ...arcPoints,
      new THREE.Vector3(0, 0.05, 0),
    ]),
    new THREE.LineBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.55 }),
  )
  wedge.add(outline)

  // A faint fill so the wedge reads as a volume of attention, not two lines.
  const fillShape = new THREE.Shape()
  fillShape.moveTo(0, 0)
  for (let i = 0; i <= 24; i += 1) {
    const a = -HALF_ANGLE + (i / 24) * HALF_ANGLE * 2
    fillShape.lineTo(Math.cos(a) * reach, Math.sin(a) * reach)
  }
  fillShape.lineTo(0, 0)
  const fill = new THREE.Mesh(
    new THREE.ShapeGeometry(fillShape),
    new THREE.MeshBasicMaterial({
      color: PALETTE.accent,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  fill.rotation.x = Math.PI / 2
  fill.position.y = 0.04
  wedge.add(fill)

  // ------------------------------------------------------------- the readout --

  const readout = new THREE.Group()
  readout.position.set(0, 11.5, 0)
  group.add(readout)

  const drawnLine = label('—', {
    size: 0.92,
    color: PALETTE.accent,
    mono: true,
    letterSpacing: 0.04,
  })
  readout.add(drawnLine)

  const readoutCaption = label(`${COUNT.toLocaleString('en-US')} OBJECTS · ONE DRAW CALL`, {
    size: 0.34,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.26,
  })
  readoutCaption.position.y = -0.95
  readout.add(readoutCaption)

  // -------------------------------------------------------- the frame budget --

  const BAR_WIDTH = 17
  const FRAME_MS = 16.6
  const COSTS: Cost[] = [
    { key: 'CULL', ms: 0.6, color: PALETTE.steel },
    { key: 'UPDATE', ms: 1.9, color: PALETTE.violet },
    { key: 'DRAW', ms: 2.4, color: PALETTE.accent },
    { key: 'SHADE', ms: 6.1, color: PALETTE.accentWarm },
  ]
  const budgets: Budget[] = []

  const bar = new THREE.Group()
  // The panel is a HUD, and placing a HUD in world coordinates does not work
  // here. `World.shotFor` pans the camera sideways by `bias` and backs it off
  // by the aspect, which leaves the view axis *offset* rather than rotated: a
  // point at world x = 0 then lands further from the frame centre the nearer it
  // is to the camera, so a panel parked in front of the field slides away from
  // it, and one parked level with the field is occluded by the near boxes.
  //
  // `placePanel` below solves both at once by working backwards from the frame:
  // project the field, pick a point below it, and put the panel on that ray at
  // a fixed distance. It then tracks the field on any aspect without this file
  // having to know what `World` did to the camera.
  group.add(bar)

  const track = new THREE.Mesh(
    new THREE.BoxGeometry(BAR_WIDTH, 1.1, 0.9),
    new THREE.MeshBasicMaterial({
      color: PALETTE.deep,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    }),
  )
  bar.add(track)

  const trackEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BAR_WIDTH, 1.1, 0.9)),
    new THREE.LineBasicMaterial({ color: PALETTE.steel, transparent: true, opacity: 0.4 }),
  )
  bar.add(trackEdge)

  let cursor = -BAR_WIDTH / 2
  COSTS.forEach((b) => {
    const width = (b.ms / FRAME_MS) * BAR_WIDTH
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.1, 0.92),
      new THREE.MeshBasicMaterial({ color: b.color, transparent: true, opacity: 0.75, toneMapped: false }),
    )
    mesh.scale.x = width
    mesh.position.x = cursor + width / 2
    bar.add(mesh)

    const tag = new THREE.Group()
    tag.position.set(cursor + width / 2, 1.5 + (budgets.length % 2) * 0.9, 0)
    bar.add(tag)

    const name = label(b.key, {
      size: 0.42,
      color: b.color,
      mono: true,
      letterSpacing: 0.2,
    })
    tag.add(name)

    const value = label(`${b.ms.toFixed(1)} MS`, {
      size: 0.34,
      color: PALETTE.steel,
      mono: true,
      letterSpacing: 0.1,
    })
    value.position.y = -0.56
    tag.add(value)

    budgets.push({ ...b, mesh, tag })
    cursor += width
  })

  const headroom = label(`${(FRAME_MS - COSTS.reduce((s, b) => s + b.ms, 0)).toFixed(1)} MS HEADROOM`, {
    size: 0.36,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.14,
  })
  headroom.position.set(BAR_WIDTH / 2 - 3.2, -1.6, 0)
  bar.add(headroom)

  const budgetCaption = label('16.6 MS — ONE FRAME AT 60 FPS', {
    size: 0.36,
    color: PALETTE.steel,
    mono: true,
    letterSpacing: 0.24,
  })
  budgetCaption.position.set(-BAR_WIDTH / 2 + 5.2, -1.6, 0)
  bar.add(budgetCaption)

  // ------------------------------------------------------------------ lights --

  const ambient = new THREE.HemisphereLight(PALETTE.accent, PALETTE.bg, 0.34)
  group.add(ambient)
  const sun = new THREE.DirectionalLight(PALETTE.ink, 0.6)
  sun.position.set(-10, 16, 8)
  group.add(sun)

  /** How far in front of the camera the panel floats, metres. */
  const PANEL_DISTANCE = 28
  /**
   * How far below the field it hangs, in normalised device units. On a stacked
   * layout the scene only owns the top band of the screen, so the panel tucks
   * in close — the desktop drop would put it behind the copy.
   */
  const dropFor = (aspect: number): number => (aspect >= 1.15 ? 0.62 : 0.17)

  const _ndc = new THREE.Vector3()
  const _ray = new THREE.Vector3()

  /**
   * Anchors the panel under the field in *screen* space, then converts back to
   * the local frame of the station. Works out to a constant apparent size and a
   * constant offset from the subject whatever the camera or the window does.
   */
  const placePanel = (camera: THREE.PerspectiveCamera, aspect: number): void => {
    _ndc.copy(group.position).project(camera)
    const y = THREE.MathUtils.clamp(_ndc.y - dropFor(aspect), -0.88, 0.62)

    _ray.set(_ndc.x, y, 0.5).unproject(camera).sub(camera.position).normalize()
    _ndc.copy(camera.position).addScaledVector(_ray, PANEL_DISTANCE)
    group.worldToLocal(_ndc)
    bar.position.copy(_ndc)

    // Fit the bar to the width the subject actually owns: beside the copy on a
    // wide screen, the whole frame once the layout stacks.
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const visibleWidth = 2 * PANEL_DISTANCE * Math.tan(fov / 2) * aspect
    const share = aspect >= 1.15 ? 0.36 : 0.82
    bar.scale.setScalar((visibleWidth * share) / BAR_WIDTH)
  }

  const colour = new THREE.Color()
  let sweep = 0
  /** troika re-tessellates on every text change, so the counter ticks, not streams. */
  let sinceLabel = 0
  let drawn = 0

  return {
    id: 'perf',
    group,
    bias: -7.5,
    shot: {
      position: anchor.clone().add(new THREE.Vector3(0, 20, 48)),
      target: anchor.clone().add(new THREE.Vector3(0, 3, 3)),
    },
    update({ dt, time, focus, camera, aspect }) {
      sweep = (sweep + dt * 0.55) % (Math.PI * 2)
      wedge.rotation.y = -sweep

      // The sweep test itself: one angular compare per object. Writing the
      // colour buffer is the only per-instance work, and it happens once.
      let visible = 0
      for (let i = 0; i < COUNT; i += 1) {
        let delta = angles[i] - sweep
        // Wrap into (-π, π] so the wedge is continuous across the seam.
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        const inside = Math.abs(delta) < HALF_ANGLE
        if (inside) visible += 1
        colour.copy(inside ? lit : dim)
        if (inside && Math.abs(delta) > HALF_ANGLE * 0.82) colour.lerp(edge, 0.5)
        field.setColorAt(i, colour)
      }
      if (field.instanceColor) field.instanceColor.needsUpdate = true
      drawn = visible

      sinceLabel += dt
      if (sinceLabel > 0.18) {
        sinceLabel = 0
        drawnLine.text = `${String(drawn).padStart(4, ' ')} / ${COUNT} SHADED`
        drawnLine.sync()
      }

      // The budget breathes rather than sits still — a frame cost is a moving
      // number, and a frozen bar would read as a diagram instead of a measure.
      let x = -BAR_WIDTH / 2
      budgets.forEach((b, i) => {
        const wobble = 1 + Math.sin(time * (0.7 + i * 0.23) + i) * 0.05
        const width = (b.ms / FRAME_MS) * BAR_WIDTH * wobble
        b.mesh.scale.x = width
        b.mesh.position.x = x + width / 2
        b.tag.position.x = x + width / 2
        x += width
        const base = b.mesh.material as THREE.MeshBasicMaterial
        base.opacity = 0.55 + clamp(focus, 0, 1) * 0.3
      })

      // One billboard for the panel; its labels are children and inherit it.
      placePanel(camera, aspect)
      billboard(bar, camera)
      billboard(readout, camera)

      group.rotation.y = Math.sin(time * 0.05) * 0.07 * focus
    },
    dispose() {
      disposeTree(group)
    },
  }
}
