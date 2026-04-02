#!/usr/bin/env node

/**
 * vec2drawable CLI
 *
 * Converts SVG files to Android VectorDrawable XML files.
 * No Java or JDK required — pure TypeScript/Node.js implementation.
 *
 * Usage: vec2drawable [-c] [-d] [-in <file|dir>] [-out <dir>] [-widthDp <n>] [-heightDp <n>] [-addHeader]
 */

const { vdTool } = require('./dist')
const args = process.argv.slice(2)

vdTool(args, {
  stderr: process.stderr,
  stdout: process.stdout,
}).catch(err => {
  const { exitCode } = err
  process.exit(exitCode || 1)
})
