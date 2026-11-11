/**
 * troika-three-text ships .d.ts files but does not point `types` at them, so
 * TypeScript cannot find them. This is the subset the deck actually uses.
 */
declare module 'troika-three-text' {
  import type { BufferGeometry, Color, Material, Mesh } from 'three'

  type TextMaterial = Material & {
    opacity: number
    transparent: boolean
    depthWrite: boolean
    toneMapped: boolean
    color: Color
  }

  export class Text extends Mesh<BufferGeometry, TextMaterial> {
    readonly isTroikaText: true
    text: string
    font: string | null
    fontSize: number
    color: Color | string | number
    anchorX: number | string
    anchorY: number | string
    letterSpacing: number
    lineHeight: number | 'normal'
    maxWidth: number
    textAlign: 'left' | 'right' | 'center' | 'justify'
    outlineWidth: number | string
    outlineColor: Color | string | number
    material: TextMaterial
    /** Rebuilds the glyph geometry; cheap to call, but not every frame. */
    sync(callback?: () => void): void
    dispose(): void
  }

  export function preloadFont(
    options: { font?: string; characters?: string | string[]; sdfGlyphSize?: number },
    callback: () => void,
  ): void
}
