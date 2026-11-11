/**
 * Screenshots every station through headless Chrome.
 *
 * Run the dev server (or `vite preview`) first, then:
 *   node scripts/capture.mjs [url] [outDir]
 *
 * It drives the deck through the hash route, one slide per browser run, so a
 * failure on one station cannot take the rest of the sheet with it.
 */
import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
/** Chrome is mostly waiting on virtual time, so a few at once costs little. */
const CONCURRENCY = 4
const VIRTUAL_TIME_MS = Number(process.env.CAPTURE_VIRTUAL_TIME ?? 7000)

const url = process.argv[2] ?? 'http://localhost:5173/'
const outDir = resolve(process.argv[3] ?? 'shots')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (!chrome) {
  console.error('No Chrome found. Set CHROME_PATH to the binary.')
  process.exit(1)
}

// The slide list is the source of truth; read the ids straight out of it.
const source = readFileSync(new URL('../src/content/slides.ts', import.meta.url), 'utf8')
const ids = [...source.matchAll(/^\s{4}id: '([a-z]+)',$/gm)].map((m) => m[1])
if (ids.length === 0) {
  console.error('Could not read slide ids from src/content/slides.ts')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const shoot = async (id, i) => {
  const file = resolve(outDir, `${String(i + 1).padStart(2, '0')}-${id}.png`)
  await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--window-size=1600,900',
    // Long enough for the fonts, the first frames and any landing animation.
    `--virtual-time-budget=${VIRTUAL_TIME_MS}`,
    `--screenshot=${file}`,
    `${url}#${id}`,
  ])
  console.log(`${id} → ${file}`)
}

const queue = ids.map((id, i) => () => shoot(id, i))
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await job()
  }),
)
