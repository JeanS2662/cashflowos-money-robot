import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

// Pin the workspace root to THIS folder. Without it, Next can pick a parent
// directory's lockfile as the root and print a confusing warning — beginners who
// clone this repo on its own never hit that, and this keeps it quiet regardless.
const here = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: { root: here },
}

export default nextConfig
