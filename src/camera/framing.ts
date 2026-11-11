import * as THREE from 'three'

/**
 * How a station is framed for the window it has to fit in.
 *
 * Every station is authored for a wide screen. A phone held upright has roughly
 * a quarter of that horizontal field, so the same shot would crop the subject
 * down to its middle — and the copy, which on a narrow screen sits across the
 * bottom rather than beside the subject, would cover what was left.
 *
 * Two corrections come out of this file, and both the engine and the world read
 * them from here so they cannot drift apart:
 *
 * 1. The vertical field of view opens as the window narrows, recovering some of
 *    the lost horizontal angle without the fish-eye a very wide lens gives.
 * 2. What the angle cannot recover, distance does — the camera backs off until
 *    the subject spans the same number of metres across as it did on 16:9.
 */

/** The aspect every station was framed for. */
export const REFERENCE_ASPECT = 16 / 9
const REFERENCE_FOV = 42

/** Below this the layout stacks: subject above, copy below. */
export const PORTRAIT_ASPECT = 1.05

export const fovForAspect = (aspect: number): number => {
  if (aspect >= 1.4) return REFERENCE_FOV
  return THREE.MathUtils.clamp(REFERENCE_FOV + (1.4 - aspect) * 30, REFERENCE_FOV, 72)
}

/** Metres visible across the screen, per metre of camera distance. */
const widthPerMetre = (aspect: number): number =>
  2 * Math.tan(THREE.MathUtils.degToRad(fovForAspect(aspect) / 2)) * aspect

const REFERENCE_WIDTH = widthPerMetre(REFERENCE_ASPECT)

/**
 * How much further back the camera has to sit for this window to show the same
 * width of subject. Capped, because past a point the station is so far away
 * that the fog eats it and the detail stops being readable anyway.
 */
export const distanceScaleFor = (aspect: number): number => {
  const scale = REFERENCE_WIDTH / widthPerMetre(aspect)
  // Matching the reference width exactly would be too timid: on a wide screen
  // the subject only gets the half of the frame the copy is not using, and in
  // the stacked layout it gets the whole width. Claiming part of that back is
  // what keeps a station from reading as a distant speck on a phone.
  const stacked = aspect < PORTRAIT_ASPECT ? 0.7 : 1
  return THREE.MathUtils.clamp(scale * stacked, 1, 3.2)
}

/**
 * How far the subject is lifted into the top of the frame, as a fraction of the
 * visible height, so the copy can own the bottom of a stacked layout. Matches
 * the `--mobile-copy` share in `styles.css`.
 */
export const liftFractionFor = (aspect: number): number => {
  if (aspect >= PORTRAIT_ASPECT) return 0
  return THREE.MathUtils.mapLinear(
    THREE.MathUtils.clamp(aspect, 0.45, PORTRAIT_ASPECT),
    PORTRAIT_ASPECT,
    0.45,
    0,
    0.32,
  )
}

/** Metres visible from top to bottom at this distance. */
export const visibleHeight = (distance: number, aspect: number): number =>
  2 * distance * Math.tan(THREE.MathUtils.degToRad(fovForAspect(aspect) / 2))
