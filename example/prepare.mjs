import { cp, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const exampleRoot = dirname(fileURLToPath(import.meta.url))
const { values } = parseArgs({ options: { 'output-root': { type: 'string' }, json: { type: 'boolean' } } })
const outputRoot = values['output-root'] ? resolve(values['output-root']) : join(exampleRoot, '.work')
await mkdir(outputRoot, { recursive: true })
// Always create a new directory. No reset, delete, overwrite, or existing repo edits.
const sourceDir = await realpath(await mkdtemp(join(outputRoot, 'checkout-')))
const fixtureDir = join(exampleRoot, 'checkout')
for (const entry of await readdir(fixtureDir)) {
  await cp(join(fixtureDir, entry), join(sourceDir, entry), { recursive: true, force: false, errorOnExist: true })
}
const git = (args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-C', sourceDir, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim()
git(['init', '-b', 'main'])
git(['add', '--', 'README.md', 'package.json', 'src', 'test'])
git(['-c', 'user.name=DSH Proof Example', '-c', 'user.email=example@invalid.local', 'commit', '--no-gpg-sign', '-m', 'fixture: intentionally broken checkout'])
const sourceHead = git(['rev-parse', 'HEAD'])
const captureDir = values['output-root'] ? join(outputRoot, `${basename(sourceDir)}-captures`) : join(exampleRoot, 'captures', basename(sourceDir))
await mkdir(captureDir, { recursive: true })
let proofCommit = 'not available'
try { proofCommit = execFileSync('git', ['-C', join(exampleRoot, '..'), 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: 'pipe' }).trim() } catch {}
const notes = (await readFile(join(exampleRoot, 'run-notes.template.md'), 'utf8'))
  .replaceAll('{{SOURCE_DIR}}', () => sourceDir)
  .replaceAll('{{SOURCE_HEAD}}', () => sourceHead)
  .replaceAll('{{PROOF_COMMIT}}', () => proofCommit)
await writeFile(join(captureDir, 'run-notes.md'), notes, { flag: 'wx' })
const result = { sourceDir, sourceHead, captureDir, expectedInitialTests: { total: 5, pass: 1, fail: 4 } }
if (values.json) process.stdout.write(`${JSON.stringify(result)}\n`)
else process.stdout.write(`Fresh demo workspace:\n${sourceDir}\n\nSave screenshots and reports here (ignored by Git by default):\n${captureDir}\n\nNext: cd into the workspace and run node --test. Expect 1 pass and 4 failures.\nUse the workspace path as Source workspace in Proof → Controlled A/B.\nDo not ask the ordinary chat to repair it before the experiment.\n`)
