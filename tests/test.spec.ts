import { vdConvert } from '../src'
import path from 'path'
import fs from 'fs'

describe('vec2drawable', () => {
  it('converts svg to VectorDrawable XML', async () => {
    const fixture = path.join(__dirname, 'fixture', 'icon.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })

    expect(result.input).toMatch(/icon\.svg/)
    expect(result.output).toMatch(/icon\.xml/)
    expect(result.errors).toBeUndefined()
    expect(result.warnings).toBeUndefined()

    const xml = fs.readFileSync(path.join(outDir, 'icon.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  }, 19999)

  it('reports errors for unresolved references', async () => {
    const fixture = path.join(__dirname, 'fixture', 'errors.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })

    expect(result.input).toMatch(/errors\.svg/)
    expect(result.output).toMatch(/errors\.xml/)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
    expect(result.errors!.every(e => e.startsWith('ERROR'))).toBe(true)

    const xml = fs.readFileSync(path.join(outDir, 'errors.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  }, 19999)
  it('handles edge scenarios with colors correctly', async () => {
    const fixture = path.join(__dirname, 'fixture', 'edge-colors.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })
    expect(result.errors).toBeUndefined()
    expect(result.warnings).toBeUndefined()
    const xml = fs.readFileSync(path.join(outDir, 'edge-colors.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  })

  it('flattens simple groups correctly', async () => {
    const fixture = path.join(__dirname, 'fixture', 'transforms.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })
    expect(result.errors).toBeUndefined()
    const xml = fs.readFileSync(path.join(outDir, 'transforms.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  })

  it('handles edge scenarios with path commands and formatting correctly', async () => {
    const fixture = path.join(__dirname, 'fixture', 'edge-paths.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })
    expect(result.errors).toBeUndefined()
    expect(result.warnings).toBeUndefined()
    const xml = fs.readFileSync(path.join(outDir, 'edge-paths.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  })

  it('generates warnings for unsupported SVG elements', async () => {
    const fixture = path.join(__dirname, 'fixture', 'unsupported.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })
    
    // SVG unsupported elements should throw warnings
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.length).toBeGreaterThan(0)
    expect(result.warnings!.some(w => w.includes('<text>'))).toBe(true)
    const xml = fs.readFileSync(path.join(outDir, 'unsupported.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  })

  it('converts basic SVG shapes and path properties correctly', async () => {
    const fixture = path.join(__dirname, 'fixture', 'shapes.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })
    expect(result.errors).toBeUndefined()
    
    // We expect 8 paths in the shapes fixture
    const xml = fs.readFileSync(path.join(outDir, 'shapes.xml'), 'utf8')
    expect(xml.match(/<path/g)?.length).toBe(8)
    expect(xml).toContain('android:strokeLineCap="round"')
    expect(xml).toContain('android:strokeLineJoin="round"')
    expect(xml).toContain('android:fillAlpha="0.8"')
    expect(xml).toContain('android:strokeAlpha="0.5"')
    expect(xml).toContain('android:fillType="evenOdd"')
    expect(xml).toMatchSnapshot()
  })

  it('handles complex SVG transformations on groups and paths correctly', async () => {
    const fixture = path.join(__dirname, 'fixture', 'complex-transforms.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    const result = await vdConvert(fixture, { outDir })
    expect(result.errors).toBeUndefined()
    
    const xml = fs.readFileSync(path.join(outDir, 'complex-transforms.xml'), 'utf8')
    // Should have multiple <group> tags due to transformations
    expect(xml.match(/<group/g)?.length).toBeGreaterThan(1)
    expect(xml).toContain('android:translateX="10"')
    expect(xml).toContain('android:translateY="20"')
    expect(xml).toContain('android:scaleX="1.5"')
    expect(xml).toContain('android:rotation="45"')
    expect(xml).toContain('android:pivotX="5"')
    expect(xml).toContain('android:pivotY="5"')
    expect(xml).toMatchSnapshot()
  })

  it('optimizes SVG using SVGO when requested', async () => {
    const fixture = path.join(__dirname, 'fixture', 'messy.svg')
    const outDir = path.join(__dirname, 'output')
    fs.mkdirSync(outDir, { recursive: true })

    // No optimize
    const resultNormal = await vdConvert(fixture, { outDir: outDir + '/normal' })
    const xmlNormal = fs.readFileSync(path.join(outDir, 'normal', 'messy.xml'), 'utf8')
    
    // With optimize
    const resultOpt = await vdConvert(fixture, { outDir: outDir + '/opt', optimize: true })
    const xmlOpt = fs.readFileSync(path.join(outDir, 'opt', 'messy.xml'), 'utf8')
    
    // Optimization typically collapses redundant groups and simplifies colors
    expect(xmlOpt.length).toBeLessThanOrEqual(xmlNormal.length)
    expect(xmlOpt).toMatchSnapshot()
  })
})
