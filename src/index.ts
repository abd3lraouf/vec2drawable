import fs from 'fs'
import path from 'path'
import { optimize as svgoOptimize, Config as SvgoConfig } from 'svgo'
import { parseSvgToVd } from './svg-to-vd'
import { writeVdXml } from './vd-xml-writer'

// Re-export types for library consumers
export type { VdTree, VdPath, VdGroup, VdNode, ConversionResult, ConversionMessage } from './vd-types'

// ─── Public option / result types ────────────────────────────────────────────

export type VdConvertOptions = {
  outDir?: string    // output directory path
  width?: number     // force width in DP
  height?: number    // force height in DP
  addHeader?: boolean // add AOSP licence header
  optimize?: boolean // use SVGO to optimize input SVG
}

export type VdConvertResult = {
  input: string
  output: string
  warnings?: string[]
  errors?: string[]
}

// ─── Core file-level conversion ───────────────────────────────────────────────

/**
 * Convert a single SVG file to a VectorDrawable XML file.
 * Returns the conversion result including any errors/warnings.
 */
export async function vdConvert(
  input: string,
  options: VdConvertOptions = {}
): Promise<VdConvertResult> {
  const { outDir, width, height, addHeader = false, optimize = false } = options

  let svgText = fs.readFileSync(input, 'utf8')

  if (optimize) {
    const config: SvgoConfig = {
      path: input,
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
        },
      ],
    }
    const optimized = svgoOptimize(svgText, config)
    svgText = optimized.data
  }

  const { tree, messages } = parseSvgToVd(svgText, width, height)
  const xml = writeVdXml(tree, addHeader)

  const { dir, name } = path.parse(input)
  const outputDir = outDir ?? dir
  const output = path.join(outputDir, name + '.xml')

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(output, xml, 'utf8')

  const result: VdConvertResult = { input, output }
  const errors = messages.filter(m => m.level === 'ERROR').map(m => m.text)
  const warnings = messages.filter(m => m.level === 'WARNING').map(m => m.text)
  if (errors.length) result.errors = errors
  if (warnings.length) result.warnings = warnings

  return result
}

// ─── CLI-level runner (used by cli.js) ───────────────────────────────────────

interface StreamOptions {
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
}

/**
 * Main CLI runner — parses argv-style args and performs conversion.
 * Mirrors the original Java CLI interface.
 */
export async function vdTool(
  args: readonly string[] = [],
  options: StreamOptions = {}
): Promise<void> {
  const stdout = options.stdout ?? process.stdout
  const stderr = options.stderr ?? process.stderr

  const write = (s: NodeJS.WritableStream, msg: string) => s.write(msg + '\n')

  // ── Argument parsing ──────────────────────────────────────────────────────
  let convert = false
  let display = false
  let inPath: string | undefined
  let outDir: string | undefined
  let widthDp: number | undefined
  let heightDp: number | undefined
  let addHeader = false
  let optimize = false

  const argList = Array.from(args)
  for (let i = 0; i < argList.length; i++) {
    const a = argList[i]
    switch (a) {
      case '-c': convert = true; break
      case '-d': display = true; break
      case '-in': inPath = argList[++i]; break
      case '-out': outDir = argList[++i]; break
      case '-widthDp': widthDp = parseInt(argList[++i], 10); break
      case '-heightDp': heightDp = parseInt(argList[++i], 10); break
      case '-addHeader':
      case '--addHeader': addHeader = true; break
      case '-optimize':
      case '--optimize': optimize = true; break
      default:
        write(stderr, `Unknown option: ${a}`)
    }
  }

  if (!convert && !display) {
    printUsage(stdout)
    return
  }

  if (!inPath) {
    write(stderr, 'Error: -in <file or directory> is required')
    throw Object.assign(new Error('missing -in'), { exitCode: 1 })
  }

  const stat = fs.statSync(inPath)
  const svgFiles = stat.isDirectory()
    ? fs.readdirSync(inPath)
      .filter(f => f.toLowerCase().endsWith('.svg'))
      .filter(f => !f.startsWith('.'))
      .map(f => path.join(inPath!, f))
    : [inPath]

  if (svgFiles.length === 0) {
    write(stderr, 'No SVG files found')
    return
  }

  for (const svgFile of svgFiles) {
    const result = await vdConvert(svgFile, { outDir, width: widthDp, height: heightDp, addHeader, optimize })
    for (const msg of result.errors ?? []) write(stderr, msg)
    for (const msg of result.warnings ?? []) write(stderr, msg)

    if (display) {
      const xml = fs.readFileSync(result.output, 'utf8')
      write(stdout, `\n=== ${result.output} ===\n${xml}`)
    }
  }
}

function printUsage(out: NodeJS.WritableStream) {
  out.write(`
Converts SVG files to VectorDrawable XML files.
Displays VectorDrawables.
Usage: [-c] [-d] [-in <file or directory>] [-out <directory>] [-widthDp <size>] [-heightDp <size>] [-addHeader] [-optimize]
Options:
  -in <file or directory>  If -c is specified, converts the given .svg file
                           to VectorDrawable XML, or if a directory is specified,
                           all .svg files in the given directory.
  -out <directory>         If specified, write converted files to the given directory.
                           If not specified, files are written next to the input files.
  -c                       Convert SVG files to VectorDrawable XML.
  -d                       Display the resulting VectorDrawable XML.
  -widthDp <size>          Force the width to be <size> dp (integer).
  -heightDp <size>         Force the height to be <size> dp (integer).
  -addHeader               Add AOSP licence header to the top of the generated XML.
  -optimize                Run SVGO optimization on input SVG files before conversion.
Examples:
  vec2drawable -c -in icon.svg
  vec2drawable -c -d -in icons/ -out drawable/
  vec2drawable -c -in icon.svg -widthDp 24 -heightDp 24 -optimize
`.trimStart())
}
