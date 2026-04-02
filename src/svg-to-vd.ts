import { DOMParser } from '@xmldom/xmldom'
import { VdTree, VdNode, VdPath, VdGroup, ConversionResult, ConversionMessage } from './vd-types'
import { convertPathData } from './path-converter'

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function normaliseColor(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const s = raw.trim()
  if (s === '' || s.toLowerCase() === 'none') return undefined
  if (s.toLowerCase() === 'transparent') return '#00000000'

  if (s.startsWith('#')) {
    if (s.length === 4) {
      // #RGB → #RRGGBB
      return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase()
    }
    return s.toUpperCase()
  }

  // rgb(r, g, b)
  const rgb = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgb) {
    const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0')
    return ('#' + toHex(rgb[1]) + toHex(rgb[2]) + toHex(rgb[3])).toUpperCase()
  }

  // Named colours (common subset)
  const named: Record<string, string> = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
  }
  const lower = s.toLowerCase()
  if (named[lower]) return named[lower].toUpperCase()

  return s
}

// ---------------------------------------------------------------------------
// Dimension parsing
// ---------------------------------------------------------------------------

function parseDimension(value: string | null): number | null {
  if (!value) return null
  const m = value.match(/^([\d.]+)/)
  return m ? parseFloat(m[1]) : null
}

function parseViewBox(vb: string | null): { x: number; y: number; w: number; h: number } | null {
  if (!vb) return null
  const parts = vb.trim().split(/[\s,]+/).map(Number)
  if (parts.length < 4 || parts.some(isNaN)) return null
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
}

// ---------------------------------------------------------------------------
// Robust attribute getter — xmldom namespaced docs can behave unexpectedly
// ---------------------------------------------------------------------------

function getAttr(el: Element, name: string): string | null {
  if (el.hasAttribute && el.hasAttribute(name)) {
    return el.getAttribute(name)
  }
  
  // Fallback: walk attributes manually
  const attrs = el.attributes
  if (!attrs) return null
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs.item(i)
    if (a && (a.localName === name || a.name === name)) return a.value
  }
  return null
}

/** Get the local element name, lower-cased */
function localName(el: Element): string {
  return (el.localName || el.tagName || '').toLowerCase()
}

// ---------------------------------------------------------------------------
// Parse context
// ---------------------------------------------------------------------------

interface ParseContext {
  fillColor?: string   // effective fill inherited from ancestors
  strokeColor?: string // effective stroke inherited from ancestors
  messages: ConversionMessage[]
}

// ---------------------------------------------------------------------------
// Shape conversion helpers
// ---------------------------------------------------------------------------

function rectToPath(el: Element): string | null {
  const x = parseDimension(getAttr(el, 'x')) ?? 0
  const y = parseDimension(getAttr(el, 'y')) ?? 0
  const w = parseDimension(getAttr(el, 'width')) ?? 0
  const h = parseDimension(getAttr(el, 'height')) ?? 0
  const rx = parseDimension(getAttr(el, 'rx')) ?? 0
  const ry = parseDimension(getAttr(el, 'ry')) ?? 0

  if (w <= 0 || h <= 0) return null

  if (rx > 0 || ry > 0) {
    // Rounded rect — complex path
    const rX = Math.min(rx || ry, w / 2)
    const rY = Math.min(ry || rx, h / 2)
    return `M${x + rX},${y} h${w - 2 * rX} a${rX},${rY} 0 0 1 ${rX},${rY} v${h - 2 * rY} a${rX},${rY} 0 0 1 -${rX},${rY} h-${w - 2 * rX} a${rX},${rY} 0 0 1 -${rX},-${rY} v-${h - 2 * rY} a${rX},${rY} 0 0 1 ${rX},-${rY} z`
  }

  return `M${x},${y} h${w} v${h} h${-w} z`
}

function circleToPath(el: Element): string | null {
  const cx = parseDimension(getAttr(el, 'cx')) ?? 0
  const cy = parseDimension(getAttr(el, 'cy')) ?? 0
  const r = parseDimension(getAttr(el, 'r')) ?? 0
  if (r <= 0) return null
  return `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`
}

function ellipseToPath(el: Element): string | null {
  const cx = parseDimension(getAttr(el, 'cx')) ?? 0
  const cy = parseDimension(getAttr(el, 'cy')) ?? 0
  const rx = parseDimension(getAttr(el, 'rx')) ?? 0
  const ry = parseDimension(getAttr(el, 'ry')) ?? 0
  if (rx <= 0 || ry <= 0) return null
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`
}

function lineToPath(el: Element): string | null {
  const x1 = parseDimension(getAttr(el, 'x1')) ?? 0
  const y1 = parseDimension(getAttr(el, 'y1')) ?? 0
  const x2 = parseDimension(getAttr(el, 'x2')) ?? 0
  const y2 = parseDimension(getAttr(el, 'y2')) ?? 0
  return `M${x1},${y1} L${x2},${y2}`
}

function polyToPath(el: Element, close: boolean): string | null {
  const pointsStr = getAttr(el, 'points') || ''
  const points = pointsStr.trim().split(/[\s,]+/).map(Number)
  if (points.length < 2 || points.some(isNaN)) return null
  let d = `M${points[0]},${points[1]}`
  for (let i = 2; i < points.length; i += 2) {
    if (i + 1 < points.length) d += ` L${points[i]},${points[i + 1]}`
  }
  if (close) d += ' z'
  return d
}

function parseTransform(transformStr: string | null): Partial<VdGroup> {
  if (!transformStr) return {}
  const res: Partial<VdGroup> = {}
  const re = /(translate|rotate|scale|matrix)\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(transformStr)) !== null) {
    const fn = m[1].toLowerCase()
    const args = m[2].split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

    if (fn === 'translate' && args.length >= 1) {
      res.translateX = (res.translateX || 0) + args[0]
      res.translateY = (res.translateY || 0) + (args[1] || 0)
    } else if (fn === 'scale' && args.length >= 1) {
      res.scaleX = args[0]
      res.scaleY = args[1] !== undefined ? args[1] : args[0]
    } else if (fn === 'rotate' && args.length >= 1) {
      res.rotation = (res.rotation || 0) + args[0]
      if (args.length >= 3) {
        res.pivotX = args[1]
        res.pivotY = args[2]
      }
    }
  }
  return res
}

// ---------------------------------------------------------------------------
// Element processing
// ---------------------------------------------------------------------------

function processElement(el: Element, ctx: ParseContext): VdNode | null {
  const tag = localName(el)

  // ── <use> — unresolved reference error ────────────────────────────────────
  if (tag === 'use') {
    const href = getAttr(el, 'xlink:href') ||
      el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
      getAttr(el, 'href')
    if (href && href.startsWith('#')) {
      const lineNum = (el as unknown as { lineNumber?: number }).lineNumber
      const lineStr = lineNum !== undefined ? ` @ line ${lineNum}` : ''
      ctx.messages.push({ level: 'ERROR', text: `ERROR${lineStr}: Referenced id not found` })
    }
    return null
  }

  // ── <mask> — process children to catch errors, produce no output ──────────
  if (tag === 'mask') {
    processChildren(el, ctx)
    return null
  }

  // ── Visual elements ───────────────────────────────────────────────────────
  const shapes: Record<string, (el: Element) => string | null> = {
    path: (el) => getAttr(el, 'd'),
    rect: rectToPath,
    circle: circleToPath,
    ellipse: ellipseToPath,
    line: lineToPath,
    polyline: (el) => polyToPath(el, false),
    polygon: (el) => polyToPath(el, true),
  }

  if (shapes[tag]) {
    const d = shapes[tag](el)
    if (!d) return null

    // Own attrs take precedence; fall back to inherited context
    const ownFill = getAttr(el, 'fill')
    const ownStroke = getAttr(el, 'stroke')

    const fill = (ownFill !== null) ? ownFill : ctx.fillColor
    const stroke = (ownStroke !== null) ? ownStroke : ctx.strokeColor

    const strokeWidth = getAttr(el, 'stroke-width')
    const fillRule = getAttr(el, 'fill-rule') || getAttr(el, 'clip-rule')
    const fillOpacity = getAttr(el, 'fill-opacity') || getAttr(el, 'opacity')
    const strokeOpacity = getAttr(el, 'stroke-opacity') || getAttr(el, 'opacity')
    const strokeLineCap = getAttr(el, 'stroke-linecap') as any
    const strokeLineJoin = getAttr(el, 'stroke-linejoin') as any

    const path: VdPath = {
      type: 'path',
      pathData: convertPathData(d),
      fillColor: normaliseColor(fill),
      strokeColor: normaliseColor(stroke),
      strokeWidth: strokeWidth ? parseFloat(strokeWidth) : undefined,
      fillAlpha: fillOpacity ? parseFloat(fillOpacity) : undefined,
      strokeAlpha: strokeOpacity ? parseFloat(strokeOpacity) : undefined,
      strokeLineCap: strokeLineCap || undefined,
      strokeLineJoin: strokeLineJoin || undefined,
      fillType: fillRule === 'evenodd' ? 'evenOdd' : (fillRule === 'nonzero' ? 'nonZero' : undefined)
    }

    const transformStr = getAttr(el, 'transform')
    if (transformStr) {
      const transform = parseTransform(transformStr)
      if (Object.keys(transform).length > 0) {
        return {
          type: 'group',
          ...transform,
          children: [path]
        }
      }
    }
    return path
  }

  // ── <g> ───────────────────────────────────────────────────────────────────
  if (tag === 'g') {
    const ownFill   = getAttr(el, 'fill')
    const ownStroke = getAttr(el, 'stroke')

    const childCtx: ParseContext = {
      ...ctx,
      fillColor:   (ownFill   !== null) ? (ownFill   === 'none' ? undefined : ownFill)   : ctx.fillColor,
      strokeColor: (ownStroke !== null) ? (ownStroke === 'none' ? undefined : ownStroke) : ctx.strokeColor,
    }

    const children = processChildren(el, childCtx)
    if (children.length === 0) return null

    const g: VdGroup = {
      type: 'group',
      name: getAttr(el, 'id') ?? undefined,
      children,
    }

    const transformStr = getAttr(el, 'transform')
    if (transformStr) {
      Object.assign(g, parseTransform(transformStr))
    }

    return g
  }

  // ── Other elements we don't support → WARNING ────────────────────────────
  const visual = ['text', 'image']
  if (visual.includes(tag)) {
    const lineNum = (el as unknown as { lineNumber?: number }).lineNumber
    const lineStr = lineNum !== undefined ? ` @ line ${lineNum}` : ''
    ctx.messages.push({ level: 'WARNING', text: `WARNING${lineStr}: Unsupported SVG element: <${tag}>` })
  }

  return null
}

function processChildren(el: Element, ctx: ParseContext): VdNode[] {
  const children: VdNode[] = []
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes.item(i)
    if (!child || child.nodeType !== 1 /* ELEMENT_NODE */) continue
    const result = processElement(child as Element, ctx)
    if (result) children.push(result)
  }
  return children
}

// ---------------------------------------------------------------------------
// Flatten groups: inline non-transform groups into their children
// This matches the Java tool's flat-path output style
// ---------------------------------------------------------------------------

function flattenGroups(nodes: VdNode[]): VdNode[] {
  const out: VdNode[] = []
  for (const node of nodes) {
    if (node.type === 'path') {
      out.push(node)
    } else {
      // group
      const flat = flattenGroups(node.children)
      const hasTransform = node.translateX !== undefined || node.translateY !== undefined ||
        node.rotation !== undefined || node.scaleX !== undefined || node.scaleY !== undefined ||
        node.pivotX !== undefined || node.pivotY !== undefined
      if (hasTransform) {
        out.push({ ...node, children: flat })
      } else {
        out.push(...flat)
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/** Suppress xmldom's noisy console output */
const silentHandler = () => { /* noop */ }

export function parseSvgToVd(
  svgText: string,
  overrideWidth?: number,
  overrideHeight?: number
): ConversionResult {
  const messages: ConversionMessage[] = []

  const parser = new DOMParser({
    errorHandler: {
      warning: silentHandler,
      error: silentHandler,
      fatalError: silentHandler,
    },
  })

  // Use text/xml to avoid xmlns-strict parsing quirks with old SVG DTDs
  const doc = parser.parseFromString(svgText, 'text/xml')

  if (!doc || !doc.documentElement) {
    messages.push({ level: 'ERROR', text: 'ERROR: Failed to parse SVG document' })
    return { tree: { width: 0, height: 0, viewportWidth: 0, viewportHeight: 0, children: [] }, messages }
  }

  // Find root <svg> element (might be doc.documentElement or first child)
  let svgEl: Element | null = doc.documentElement
  if (localName(svgEl) !== 'svg') {
    svgEl = null
    for (let i = 0; i < doc.documentElement.childNodes.length; i++) {
      const n = doc.documentElement.childNodes.item(i)
      if (n && n.nodeType === 1 && localName(n as Element) === 'svg') {
        svgEl = n as Element
        break
      }
    }
  }
  if (!svgEl) {
    messages.push({ level: 'ERROR', text: 'ERROR: Not a valid SVG document' })
    return { tree: { width: 0, height: 0, viewportWidth: 0, viewportHeight: 0, children: [] }, messages }
  }

  // Parse dimensions
  const viewBox     = parseViewBox(getAttr(svgEl, 'viewBox'))
  const rawW        = parseDimension(getAttr(svgEl, 'width'))
  const rawH        = parseDimension(getAttr(svgEl, 'height'))
  const viewportW   = viewBox?.w ?? rawW ?? 0
  const viewportH   = viewBox?.h ?? rawH ?? 0
  const width       = overrideWidth  ?? rawW ?? viewportW
  const height      = overrideHeight ?? rawH ?? viewportH

  const ctx: ParseContext = { messages }

  const raw      = processChildren(svgEl, ctx)
  const children = flattenGroups(raw)

  return {
    tree: {
      width:          Math.round(width),
      height:         Math.round(height),
      viewportWidth:  viewportW,
      viewportHeight: viewportH,
      children,
    },
    messages,
  }
}
