# @abd3lraouf/vec2drawable

A pure TypeScript, zero-dependency (JDK-free) command-line tool and Node.js library for converting SVG files into Android VectorDrawable XML files.

This is a modern rewrite of the original Android Studio VectorDrawable conversion tool, fully eliminating the need for a Java Runtime Environment.

## Installation

You can install `vec2drawable` globally or add it as a dependency to your project. Supports `npm`, `pnpm`, and `bun`.

### Using `bun` (Recommended)
```bash
# Global CLI
bun add -g @abd3lraouf/vec2drawable

# Project Dependency
bun add @abd3lraouf/vec2drawable
```

### Using `pnpm`
```bash
# Global CLI
pnpm add -g @abd3lraouf/vec2drawable

# Project Dependency
pnpm add @abd3lraouf/vec2drawable
```

### Using `npm`
```bash
# Global CLI
npm i -g @abd3lraouf/vec2drawable

# Project Dependency
npm i @abd3lraouf/vec2drawable
```

## CLI Usage

```bash
vec2drawable [-c] [-d] [-in <file or directory>] [-out <directory>] [-widthDp <size>] [-heightDp <size>] [-addHeader]
```

### Options

*   `-in <file or directory>`: If `-c` is specified, converts the given `.svg` file to VectorDrawable XML, or if a directory is specified, all `.svg` files in the given directory. 
*   `-out <directory>`: If specified, write converted files out to the given directory, which must exist. If not specified, the converted files will be written to the directory containing the input files.
*   `-c`: Convert SVG files to VectorDrawable XML.
*   `-d`: Display the results of the conversion in the terminal.
*   `-widthDp <size>`: Force the width to be `<size>` dp, `<size>` must be an integer.
*   `-heightDp <size>`: Force the height to be `<size>` dp, `<size>` must be an integer.
*   `-addHeader`: Add the AOSP copyright header to the top of the generated XML file.

### Examples

**1. Convert a single SVG file:**
```bash
vec2drawable -c -in icon.svg
```

**2. Convert all SVG files in a directory to a specific output folder:**
```bash
vec2drawable -c -in ./svgs -out ./res/drawable
```

**3. Convert and display the XML output in the terminal:**
```bash
vec2drawable -c -d -in icon.svg
```

**4. Convert and resize:**
```bash
vec2drawable -c -in icon.svg -widthDp 24 -heightDp 24
```

## Node.js Library Usage

You can also use `vec2drawable` programmatically in your Node.js scripts.

```typescript
import { vdConvert } from '@abd3lraouf/vec2drawable';

async function convertIcon() {
  try {
    const result = await vdConvert('path/to/icon.svg', {
      outDir: 'path/to/output/dir', // Optional output directory
      width: 24,                    // Optional forced width in DP
      height: 24,                   // Optional forced height in DP
      addHeader: true               // Optional AOSP header injection
    });

    console.log(`Successfully converted to ${result.output}`);
    
    // Warnings and errors from the conversion are captured here:
    if (result.warnings) {
      console.warn('Warnings:', result.warnings);
    }
  } catch (err) {
    console.error('Conversion failed:', err);
  }
}

convertIcon();
```

## License
MIT
