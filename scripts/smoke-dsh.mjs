import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
    const profileRequire = createRequire(join(dshHome, 'profiles', 'web', 'package.json'))
    let serverResponseSchema
    try {
      const schemaPath = profileRequire.resolve('@deepseek-ai/dsh-host-apiproxy/api/rpc.schema')
      ;({ serverResponseSchema } = await import(pathToFileURL(schemaPath).href))
    } catch (error) {
      // Newer distributions do not expose this package. Keep wire assertions
      // below, but require the official schema for the minimum-version gate.
      if (version === '0.1.1-rc.2' || error.code !== 'MODULE_NOT_FOUND') throw error
    }
    const browser = await openIndex(url)
    const index = browser.index
    const clientUrl = pluginClientUrl(url, index)
    let client
    try {
      client = await fetchText(clientUrl, browser.cookie)
    } catch (error) {
      const at = index.indexOf('dsh-proof')
      const fragment = at < 0 ? index.slice(0, 800) : index.slice(Math.max(0, at - 300), at + 600)
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nDSH boot fragment:\n${fragment}`)
    }
    if (!index.includes('"id":"dsh-proof"')) throw new Error('DSH boot manifest does not include dsh-proof')
    if (!index.includes('"inject":["connection","slots"]')) throw new Error('DSH boot manifest has unexpected dsh-proof client injections')
    if (!client.includes('DSH Proof')) throw new Error('dsh-proof client bundle is missing its UI marker')
    for (const method of ['list', 'presets', 'models', 'controlled-progress', 'unknown-endpoint']) {
      const response = await fetch(endpoint(url, `/dsh-proof/${method}`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(browser.cookie ? { cookie: browser.cookie } : {}) },
        body: JSON.stringify({ type: 'client-request', rpcId: method, method, payload: method === 'controlled-progress' ? { runId: 'smoke-missing-run' } : {} }),
      })
      if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`)
      const body = await response.json()
      const envelope = serverResponseSchema ? serverResponseSchema.parse(body) : body
      if (envelope.type !== 'server-response' || envelope.rpcId !== method) throw new Error(`${method}: invalid RPC envelope`)
      const result = envelope.result
      if (method === 'unknown-endpoint') {
        if (result.ok !== false || result.error?.code !== 'internal' || !result.error.details) throw new Error(`Invalid error contract: ${JSON.stringify(result)}`)
      } else if (result.ok !== true) {
        throw new Error(`${method}: ${JSON.stringify(result)}`)
      } else if (method === 'controlled-progress') {
        if (result.value !== null) throw new Error('Missing runs must have null progress')
      } else {
        const key = { list: 'sessions', presets: 'presets', models: 'providers' }[method]
        if (!Array.isArray(result.value?.[key])) throw new Error(`${method}: missing ${key}`)
      }
    }
    process.stdout.write(`dsh-proof compatibility smoke passed: DSH ${version} at ${new URL(url).origin}\n`)
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
      const match = output().match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/?(?:\?token=[^\s]+)?)/)
      if (match?.[1]) return resolvePromise(match[1])
      if (server.exitCode !== null) return reject(new Error(`DSH Web exited before listening\n${output()}`))
      if (Date.now() - started >= timeoutMs) return reject(new Error(`Timed out waiting for DSH Web\n${output()}`))
      setTimeout(inspect, 100)
    }
    inspect()
  })
}

function endpoint(base, pathname) {
  const url = new URL(base)
  url.pathname = pathname
  url.search = ''
  return url.href
}

function pluginClientUrl(base, index) {
  const marker = 'globalThis["__DSH_BOOT__"] = '
  const start = index.indexOf(marker)
  const end = start < 0 ? -1 : index.indexOf('</script>', start)
  if (end > start) {
    const source = index.slice(start + marker.length, end).trim().replace(/;$/, '')
    const boot = JSON.parse(source)
    const entry = Array.isArray(boot.entries) ? boot.entries.find((item) => item?.id === 'dsh-proof') : undefined
    if (typeof entry?.url === 'string') return new URL(entry.url, base).href
  }
  return endpoint(base, '/plugins/dsh-proof/client.js')
}

async function openIndex(url) {
  const launch = await fetch(url, { redirect: 'manual' })
  if (launch.status >= 300 && launch.status < 400) {
    const cookie = launch.headers.get('set-cookie')?.split(';', 1)[0]
    const location = launch.headers.get('location')
    if (!cookie || !location) throw new Error(`DSH launch-token exchange returned HTTP ${launch.status} without a session cookie and redirect`)
    return { index: await fetchText(new URL(location, url).href, cookie), cookie }
  }
  if (!launch.ok) throw new Error(`${url} returned HTTP ${launch.status}`)
  return { index: await launch.text(), cookie: undefined }
}

async function fetchText(url, cookie) {
  const response = await fetch(url, cookie ? { headers: { cookie } } : undefined)
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((resolvePromise) => child.once('exit', resolvePromise))
  child.kill('SIGINT')
  await Promise.race([
    exited,
    new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000)),
  ])
  if (child.exitCode === null && child.signalCode === null) {
    const killed = new Promise((resolvePromise) => child.once('exit', resolvePromise))
    child.kill('SIGKILL')
    await killed
  }
}
