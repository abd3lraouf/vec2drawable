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
    expect(result.warnings!.some(w => w.includes('<rect>'))).toBe(true)
    expect(result.warnings!.some(w => w.includes('<circle>'))).toBe(true)
    expect(result.warnings!.some(w => w.includes('<text>'))).toBe(true)
    const xml = fs.readFileSync(path.join(outDir, 'unsupported.xml'), 'utf8')
    expect(xml).toMatchSnapshot()
  })
})
