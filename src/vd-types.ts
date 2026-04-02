/**
 * VectorDrawable TypeScript types
 */

export interface VdPath {
  type: 'path'
  pathData: string
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  strokeAlpha?: number
  fillAlpha?: number
  strokeLineCap?: 'butt' | 'round' | 'square'
  strokeLineJoin?: 'miter' | 'round' | 'bevel'
  fillType?: 'nonZero' | 'evenOdd'
}

export interface VdGroup {
  type: 'group'
  name?: string
  translateX?: number
  translateY?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  pivotX?: number
  pivotY?: number
  children: VdNode[]
}

export type VdNode = VdPath | VdGroup

export interface VdTree {
  width: number    // in dp
  height: number   // in dp
  viewportWidth: number
  viewportHeight: number
  children: VdNode[]
}

export interface ConversionMessage {
  level: 'ERROR' | 'WARNING'
  text: string
}

export interface ConversionResult {
  tree: VdTree
  messages: ConversionMessage[]
}
