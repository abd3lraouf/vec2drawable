/**
 * SVG path data converter for Android VectorDrawable pathData format.
 *
 * SVG path data uses space-separated coordinates; Android expects
 * comma-separated. The command letters are the same, but we need to
 * normalise the number formatting.
 */

/**
 * Tokenise an SVG path data string into an array of tokens where each
 * token is either a command letter or a numeric string.
 */
function tokenise(d: string): string[] {
  const tokens: string[] = []
  // Match command letters or numbers (including scientific notation)
  const re = /([MmZzLlHhVvCcSsQqTtAa])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    tokens.push(m[0])
  }
  return tokens
}

/**
 * Format a number for Android pathData output.
 * Trims trailing zeros so 34.0000 → 34, 34.50 → 34.5
 */
function formatNum(n: string): string {
  const f = parseFloat(n)
  if (isNaN(f)) return n
  // Use toFixed to avoid exponential notation, then trim
  let s = f.toFixed(8).replace(/\.?0+$/, '')
  return s
}

/**
 * Convert SVG path data to Android VectorDrawable pathData format.
 *
 * The key difference is that coordinates within a command group should be
 * comma-separated, while different command groups are placed on the same line
 * separated by spaces (matching the Java tool output).
 */
export function convertPathData(svgPathData: string): string {
  const tokens = tokenise(svgPathData)
  if (tokens.length === 0) return svgPathData

  // Commands and how many numbers they take per set
  const commandArity: Record<string, number> = {
    M: 2, m: 2,
    L: 2, l: 2,
    H: 1, h: 1,
    V: 1, v: 1,
    C: 6, c: 6,
    S: 4, s: 4,
    Q: 4, q: 4,
    T: 2, t: 2,
    A: 7, a: 7,
    Z: 0, z: 0,
  }

  const parts: string[] = []
  let i = 0
  while (i < tokens.length) {
    const cmd = tokens[i]
    if (/^[MmZzLlHhVvCcSsQqTtAa]$/.test(cmd)) {
      i++
      const arity = commandArity[cmd] ?? 0
      if (arity === 0) {
        parts.push(cmd)
        continue
      }
      // Collect repeated coordinate sets for this command
      const sets: string[][] = []
      while (i < tokens.length && !/^[MmZzLlHhVvCcSsQqTtAa]$/.test(tokens[i])) {
        const set: string[] = []
        for (let j = 0; j < arity && i < tokens.length && !/^[MmZzLlHhVvCcSsQqTtAa]$/.test(tokens[i]); j++) {
          set.push(formatNum(tokens[i]))
          i++
        }
        if (set.length > 0) sets.push(set)
      }
      // Write first set as "CMD x,y", subsequent sets join inline (implicit repeat)
      if (sets.length > 0) {
        parts.push(cmd + sets[0].join(','))
        for (let s = 1; s < sets.length; s++) {
          parts.push(sets[s].join(','))
        }
      } else {
        parts.push(cmd)
      }
    } else {
      // lone number without command — skip/pass through
      i++
    }
  }

  return parts.join(' ')
}
