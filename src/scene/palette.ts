import * as THREE from 'three'

/**
 * One palette for the whole world. The CSS custom properties in `styles.css`
 * carry the same values — if one side changes, change the other.
 */
export const PALETTE = {
  bg: new THREE.Color('#06080c'),
  fog: new THREE.Color('#070a10'),
  accent: new THREE.Color('#5ee0c0'),
  accentWarm: new THREE.Color('#ffb561'),
  ink: new THREE.Color('#e9eef6'),
  steel: new THREE.Color('#5d6a7c'),
  deep: new THREE.Color('#121a26'),
  violet: new THREE.Color('#8b7bd8'),
  alert: new THREE.Color('#ff6b6b'),
}

/** Thin emissive line material used for every wireframe in the deck. */
export const lineMaterial = (color: THREE.Color, opacity = 0.5): THREE.LineBasicMaterial =>
  new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  })

/** Matte surface that reads as machined metal under the three-light rig. */
export const solidMaterial = (color: THREE.Color, roughness = 0.55): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.15,
    flatShading: false,
  })

/** Unlit glow for markers, ports and particles. */
export const glowMaterial = (color: THREE.Color, opacity = 1): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
  })
