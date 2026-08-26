import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv.slice(2).find((argument) => argument !== '--') ?? 'latest'
if (!/^(?:latest|next|\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.test(version)) throw new Error(`Invalid DSH version: ${version}`)

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshHome = await mkdtemp(join(tmpdir(), 'dsh-proof-compat-'))
const command = `@deepseek-ai/dsh@${version}`

try {
  await run(['dlx', command, 'plugin', '--profile', 'web', 'add', `link:${repository}`], { DSH_HOME: dshHome })
  const server = spawn('pnpm', ['dlx', command, 'web', '--no-open', '--host', '127.0.0.1', '--port', '0'], {
    cwd: repository,
    env: { ...process.env, DSH_HOME: dshHome },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const collect = (chunk) => { output = `${output}${chunk}`.slice(-100_000) }
  server.stdout.on('data', collect)
  server.stderr.on('data', collect)
  try {
    const url = await waitForUrl(server, () => output, 120_000)
    const [index, client] = await Promise.all([
      fetchText(`${url}/`),
      fetchText(`${url}/plugins/dsh-proof/client.js`),
    ])
    if (!index.includes('"id":"dsh-proof"')) throw new Error('DSH boot manifest does not include dsh-proof')
    if (!index.includes('"inject":["connection","slots"]')) throw new Error('DSH boot manifest has unexpected dsh-proof client injections')
    if (!client.includes('DSH Proof')) throw new Error('dsh-proof client bundle is missing its UI marker')
    process.stdout.write(`dsh-proof compatibility smoke passed: DSH ${version} at ${url}\n`)
  } finally {
    await stop(server)
  }
} finally {
  await rm(dshHome, { recursive: true, force: true })
}

function run(args, extraEnv) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('pnpm', args, {
      cwd: repository,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (chunk) => { output = `${output}${chunk}`.slice(-100_000) })
    child.stderr.on('data', (chunk) => { output = `${output}${chunk}`.slice(-100_000) })
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0
      ? resolvePromise()
      : reject(new Error(`pnpm ${args.join(' ')} failed (${code ?? signal})\n${output}`)))
  })
}

function waitForUrl(server, output, timeoutMs) {
  return new Promise((resolvePromise, reject) => {
    const started = Date.now()
    const inspect = () => {
      const match = output().match(/dsh web: (http:\/\/127\.0\.0\.1:\d+)/)
      if (match?.[1]) return resolvePromise(match[1])
      if (server.exitCode !== null) return reject(new Error(`DSH Web exited before listening\n${output()}`))
      if (Date.now() - started >= timeoutMs) return reject(new Error(`Timed out waiting for DSH Web\n${output()}`))
      setTimeout(inspect, 100)
    }
    inspect()
  })
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

async function stop(child) {
  if (child.exitCode !== null) return
  child.kill('SIGINT')
  await Promise.race([
    new Promise((resolvePromise) => child.once('exit', resolvePromise)),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000)),
  ])
  if (child.exitCode === null) {
    child.kill('SIGKILL')
    await new Promise((resolvePromise) => child.once('exit', resolvePromise))
  }
}
