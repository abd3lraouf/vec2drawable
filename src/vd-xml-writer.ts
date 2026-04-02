import { VdTree, VdNode, VdPath, VdGroup } from './vd-types'

const AOSP_HEADER = `<!-- Copyright (C) ${new Date().getFullYear()} The Android Open Source Project

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->
`

function fmtNum(n: number): string {
  // Format like the Java tool: integer values emit as integers, floats as floats
  if (Number.isInteger(n)) return String(n)
  return parseFloat(n.toFixed(4)).toString()
}

function writeNode(node: VdNode, indent: string): string {
  if (node.type === 'path') {
    return writePath(node as VdPath, indent)
  } else if (node.type === 'group') {
    return writeGroup(node as VdGroup, indent)
  }
  return ''
}

function writePath(path: VdPath, indent: string): string {
  const attrs: string[] = []
  attrs.push(`android:pathData="${path.pathData}"`)
  if (path.fillColor) attrs.push(`android:fillColor="${path.fillColor}"`)
  if (path.strokeColor) attrs.push(`android:strokeColor="${path.strokeColor}"`)
  if (path.strokeWidth !== undefined) attrs.push(`android:strokeWidth="${fmtNum(path.strokeWidth)}"`)
  if (path.strokeAlpha !== undefined) attrs.push(`android:strokeAlpha="${fmtNum(path.strokeAlpha)}"`)
  if (path.fillAlpha !== undefined) attrs.push(`android:fillAlpha="${fmtNum(path.fillAlpha)}"`)
  if (path.strokeLineCap) attrs.push(`android:strokeLineCap="${path.strokeLineCap}"`)
  if (path.strokeLineJoin) attrs.push(`android:strokeLineJoin="${path.strokeLineJoin}"`)
  if (path.fillType) attrs.push(`android:fillType="${path.fillType}"`)

  const innerIndent = indent + '    '
  const attrStr = attrs.map((a, i) => (i === 0 ? a : innerIndent + a)).join('\n')
  return `${indent}<path\n${innerIndent}${attrStr}/>`
}

function writeGroup(group: VdGroup, indent: string): string {
  const innerIndent = indent + '  '
  const attrs: string[] = []
  if (group.name) attrs.push(`android:name="${group.name}"`)
  if (group.translateX !== undefined) attrs.push(`android:translateX="${fmtNum(group.translateX)}"`)
  if (group.translateY !== undefined) attrs.push(`android:translateY="${fmtNum(group.translateY)}"`)
  if (group.scaleX !== undefined) attrs.push(`android:scaleX="${fmtNum(group.scaleX)}"`)
  if (group.scaleY !== undefined) attrs.push(`android:scaleY="${fmtNum(group.scaleY)}"`)
  if (group.rotation !== undefined) attrs.push(`android:rotation="${fmtNum(group.rotation)}"`)
  if (group.pivotX !== undefined) attrs.push(`android:pivotX="${fmtNum(group.pivotX)}"`)
  if (group.pivotY !== undefined) attrs.push(`android:pivotY="${fmtNum(group.pivotY)}"`)

  const attrStr = attrs.length > 0 ? '\n' + attrs.map(a => innerIndent + a).join('\n') : ''
  const childrenStr = group.children.map(c => writeNode(c, innerIndent)).join('\n')

  return `${indent}<group${attrStr}>\n${childrenStr}\n${indent}</group>`
}

/**
 * Serialize a VdTree to an Android VectorDrawable XML string.
 */
export function writeVdXml(tree: VdTree, addHeader = false): string {
  const lines: string[] = []

  if (addHeader) {
    lines.push(AOSP_HEADER)
  }

  lines.push(`<vector xmlns:android="http://schemas.android.com/apk/res/android"`)
  lines.push(`    android:width="${fmtNum(tree.width)}dp"`)
  lines.push(`    android:height="${fmtNum(tree.height)}dp"`)
  lines.push(`    android:viewportWidth="${fmtNum(tree.viewportWidth)}"`)
  lines.push(`    android:viewportHeight="${fmtNum(tree.viewportHeight)}">`)

  for (const node of tree.children) {
    lines.push(writeNode(node, '  '))
  }

  lines.push(`</vector>`)

  return lines.join('\n') + '\n'
}
