import { open, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseDocument } from 'yaml'
import type { ProofRun } from '../core/types.ts'

type Identity = Pick<ProofRun, 'presetId' | 'presetName' | 'plugin' | 'pluginVersion'> & { pluginSource?: 'package-manifest' | 'preset-registration' }

async function metadata(path: string): Promise<Record<string, unknown> | unknown[] | null> {
  try {
    const file = await open(path, 'r')
    try {
      if ((await file.stat()).size > 64_000) return null
      const text = await file.readFile('utf8')
      const document = parseDocument(text)
      if (document.errors.length || document.warnings.length) return null
      const value: unknown = document.toJS({ maxAliasCount: 20 })
      return value && typeof value === 'object' ? value as Record<string, unknown> : null
    } finally { await file.close() }
  } catch { return null }
}

const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim() && value.length <= 200 ? value.trim() : undefined
const packageName = (value: unknown): string | undefined => {
  const name = text(value)
  return name && /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/.test(name) ? name : undefined
}

/** Identify the preset's owning bundle, never infer ownership from its display name. */
export async function readPresetIdentity(preset: { id: string; name?: string; path?: string }): Promise<Identity> {
  const identity: Identity = { presetId: preset.id, presetName: preset.name ?? preset.id }
  if (!preset.path) return identity
  const path = await realpath(preset.path).catch(() => null)
  if (!path) return identity
  const root = dirname(path)
  const manifest = await metadata(join(root, 'package.json'))
  if (manifest && !Array.isArray(manifest)) {
    const plugin = packageName(manifest.name)
    if (plugin) return { ...identity, plugin, pluginSource: 'package-manifest', ...(text(manifest.version) ? { pluginVersion: text(manifest.version)! } : {}) }
  }
  const patch = await metadata(join(root, 'cordis.patch.yml'))
  if (!Array.isArray(patch)) return identity
  const names = new Set<string>()
  for (const operation of patch) {
    if (!operation || typeof operation !== 'object') continue
    const entries = (operation as Record<string, unknown>).insert
    if (!Array.isArray(entries)) continue
    for (const entry of entries) {
      const name = packageName(entry && typeof entry === 'object' ? entry.name : undefined)
      if (name) names.add(name)
    }
  }
  // A composition can contain many plugins. Ambiguous ownership stays unknown.
  if (names.size !== 1) return identity
  const display = await metadata(join(root, 'preset.yml'))
  const version = display && !Array.isArray(display) ? text(display.version) : undefined
  return { ...identity, plugin: [...names][0]!, pluginSource: 'preset-registration', ...(version ? { pluginVersion: version } : {}) }
}
