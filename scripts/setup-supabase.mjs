#!/usr/bin/env node
/**
 * Tea Content Mansion — Supabase setup
 *
 *   npm run setup            configure, then verify
 *   npm run setup -- --check verify only, change nothing
 *
 * Asks for the values, writes `.env.local`, then checks the database really is
 * ready — that the tables exist, that they have the tax columns, and that the
 * key works. Guessing that a setup worked is how you find out in front of a
 * client that it did not.
 *
 * Applying the schema needs more privilege than the anon key has, so the script
 * offers two routes: paste the SQL into the Supabase editor yourself (always
 * works), or hand over a personal access token and let the script run it.
 *
 * Node 18+. No dependencies beyond what the project already has.
 */

import { createInterface } from 'node:readline'
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = resolve(ROOT, '.env.local')
const SCHEMA_PATH = resolve(ROOT, 'supabase', 'schema.sql')

const CHECK_ONLY = process.argv.includes('--check')

/* ── output ─────────────────────────────────────────────────────────────── */

const useColour = process.stdout.isTTY && !process.env.NO_COLOR
const ESC = String.fromCharCode(27)
const paint = (code) => (text) => (useColour ? ESC + '[' + code + 'm' + text + ESC + '[0m' : text)
const brass = paint('33')
const dim = paint('2')
const bold = paint('1')
const green = paint('32')
const red = paint('31')

const say = (text = '') => console.log(text)
const ok = (text) => say(`  ${green('✓')} ${text}`)
const bad = (text) => say(`  ${red('✗')} ${text}`)
const warn = (text) => say(`  ${brass('!')} ${text}`)
const note = (text) => say(`    ${dim(text)}`)

function heading(text) {
  say()
  say(bold(text))
  say(dim('─'.repeat(Math.min(text.length + 8, 60))))
}

/* ── prompting ──────────────────────────────────────────────────────────── */

let rl

function openInput() {
  if (!process.stdin.isTTY) {
    bad('This script needs an interactive terminal.')
    note('Run it directly: npm run setup')
    process.exit(1)
  }
  rl = createInterface({ input: process.stdin, output: process.stdout })
}

/**
 * One question. Enter keeps the current value when there is one.
 *
 * `secret` hides typing — used only for the access token, which is a real
 * credential. The anon key is public by design, so hiding it would just make it
 * harder to check you pasted the right thing.
 */
function ask(question, { fallback = '', secret = false, hint = '' } = {}) {
  const shown = fallback ? ` ${dim(`[${secret ? mask(fallback) : fallback}]`)}` : ''
  const prompt = `${brass('?')} ${question}${shown}\n${hint ? `  ${dim(hint)}\n` : ''}  ${dim('›')} `

  return new Promise((resolve) => {
    if (!secret) {
      rl.question(prompt, (answer) => resolve(answer.trim() || fallback))
      return
    }
    // Suppress the echo while the token is typed.
    const original = rl._writeToOutput
    rl._writeToOutput = function (chunk) {
      if (chunk.includes('›') || chunk.includes('\n')) original.call(rl, chunk)
    }
    rl.question(prompt, (answer) => {
      rl._writeToOutput = original
      say()
      resolve(answer.trim() || fallback)
    })
  })
}

async function confirm(question, defaultYes = true) {
  const answer = await ask(`${question} ${dim(defaultYes ? '(Y/n)' : '(y/N)')}`)
  if (!answer) return defaultYes
  return /^y(es)?$/i.test(answer.trim())
}

const mask = (value) =>
  value.length <= 12 ? '••••' : `${value.slice(0, 6)}…${value.slice(-4)}`

/* ── env file ───────────────────────────────────────────────────────────── */

const KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_GST_PERCENT', 'VITE_PASS_PIN']

export async function readEnv() {
  if (!existsSync(ENV_PATH)) return {}
  const text = await readFile(ENV_PATH, 'utf8')
  const found = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) found[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
  }
  return found
}

export async function writeEnv(values, previous) {
  // Keep anything the project does not manage, so hand-added settings survive.
  const extras = Object.entries(previous).filter(([key]) => !KEYS.includes(key))

  const body = [
    '# Tea Content Mansion — local configuration',
    '# Written by `npm run setup`. Never committed: .gitignore covers *.local.',
    '#',
    '# On a host (Cloudflare Pages, Netlify) set these in the dashboard instead,',
    '# and remember Vite bakes them in at BUILD time — add them before the first',
    '# deploy, or trigger a rebuild afterwards.',
    '',
    '# The order database. Blank means orders stay in one browser and a',
    "# customer's phone cannot reach the kitchen.",
    `VITE_SUPABASE_URL=${values.VITE_SUPABASE_URL ?? ''}`,
    `VITE_SUPABASE_ANON_KEY=${values.VITE_SUPABASE_ANON_KEY ?? ''}`,
    '',
    '# GST rate. Blank shows "GST extra, as applicable", like the printed card.',
    `VITE_GST_PERCENT=${values.VITE_GST_PERCENT ?? ''}`,
    '',
    '# Pass code for ?view=admin. A speed bump, not security — it ships in the',
    '# bundle. Pair it with host-level access control.',
    `VITE_PASS_PIN=${values.VITE_PASS_PIN ?? ''}`,
    ...(extras.length ? ['', '# Kept from your previous .env.local', ...extras.map(([k, v]) => `${k}=${v}`)] : []),
    '',
  ].join('\n')

  if (existsSync(ENV_PATH)) {
    await copyFile(ENV_PATH, `${ENV_PATH}.bak`)
    note('Previous .env.local saved as .env.local.bak')
  }
  await writeFile(ENV_PATH, body, 'utf8')
}

/* ── validation ─────────────────────────────────────────────────────────── */

export function checkUrl(value) {
  if (!value) return { error: 'The project URL is required.' }
  let url
  try {
    url = new URL(value)
  } catch {
    return { error: 'That is not a URL. It looks like https://abcdefgh.supabase.co' }
  }
  if (url.protocol !== 'https:') return { error: 'It must start with https://' }

  const ref = url.hostname.endsWith('.supabase.co') ? url.hostname.split('.')[0] : null
  if (!ref) {
    return { value: url.origin, ref: null, warning: 'Not a *.supabase.co host — assuming a custom domain.' }
  }
  return { value: url.origin, ref }
}

/**
 * The one mistake worth refusing outright.
 *
 * The service_role key bypasses every access rule. Pasted here it would be
 * compiled into the JavaScript and handed to every customer's phone, which
 * hands them the whole database. Refuse, do not warn.
 */
export function checkKey(value) {
  if (!value) return { error: 'The key is required.' }

  if (value.startsWith('sb_secret_')) {
    return { error: 'That is the SECRET key. Use the publishable / anon key — this one goes into a browser.' }
  }
  if (value.startsWith('sb_publishable_')) return { value }

  const parts = value.split('.')
  if (parts.length !== 3) {
    return { error: 'That does not look like a Supabase key. Copy "anon public" from Project Settings → API.' }
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    if (payload.role === 'service_role') {
      return {
        error:
          'That is the SERVICE_ROLE key. It bypasses all access rules and would be shipped to every customer\'s phone. Use "anon public".',
      }
    }
    if (payload.role && payload.role !== 'anon') {
      return { value, warning: `The key says role "${payload.role}" — expected "anon".` }
    }
    return { value }
  } catch {
    return { value, warning: 'Could not read the key to confirm it is the anon one.' }
  }
}

export function checkGst(value) {
  if (!value) return { value: '' }
  const number = Number(value.replace('%', '').trim())
  if (!Number.isFinite(number) || number < 0 || number >= 100) {
    return { error: 'Enter a number like 5, or leave it blank.' }
  }
  return { value: String(number) }
}

export function checkPin(value) {
  if (!value) return { value: '', warning: 'No pass code: anyone with the URL can open the kitchen pass.' }
  if (!/^[A-Za-z0-9]{3,12}$/.test(value)) {
    return { error: 'Use 3 to 12 letters or digits.' }
  }
  return { value }
}

/** Keep asking until it passes. */
async function askValidated(question, validate, options) {
  for (;;) {
    const answer = await ask(question, options)
    const result = validate(answer)
    if (result.error) {
      bad(result.error)
      continue
    }
    if (result.warning) warn(result.warning)
    return result
  }
}

/* ── talking to Supabase ────────────────────────────────────────────────── */

export async function probe(url, key, table, select = 'id') {
  const endpoint = `${url}/rest/v1/${table}?select=${select}&limit=1`
  try {
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (response.ok) return { state: 'ok' }

    const body = await response.text()

    // Column errors before table errors: Postgres says "column x does not
    // exist", so a looser table test would swallow it and report the whole
    // table missing.
    if (/PGRST204|42703/i.test(body) || /column .* does not exist/i.test(body)) {
      return { state: 'missing-column', detail: body }
    }
    if (response.status === 404 || /PGRST205/i.test(body) || /relation .* does not exist/i.test(body)) {
      return { state: 'missing-table', detail: body }
    }
    if (response.status === 401 || response.status === 403) return { state: 'bad-key', detail: body }
    return { state: 'error', detail: `${response.status} ${body.slice(0, 160)}` }
  } catch (cause) {
    return { state: 'unreachable', detail: cause.message }
  }
}

/** Run the schema through the Management API. Needs a personal access token. */
async function applySchema(ref, token, sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (response.ok) return { ok: true }
  return { ok: false, detail: `${response.status} ${(await response.text()).slice(0, 300)}` }
}

/* ── the run ────────────────────────────────────────────────────────────── */

async function verify(url, key) {
  heading('Checking the database')

  const orders = await probe(url, key, 'orders', 'id')

  if (orders.state === 'unreachable') {
    bad('Cannot reach that project.')
    note(orders.detail)
    note('Check the URL, and check the project is not paused in the Supabase dashboard.')
    return false
  }
  if (orders.state === 'bad-key') {
    bad('The project answered, but rejected the key.')
    note('Copy "anon public" again from Project Settings → API.')
    return false
  }
  if (orders.state === 'missing-table') {
    bad('The `orders` table does not exist — the schema has not been applied.')
    return false
  }
  if (orders.state === 'error') {
    bad('Unexpected answer from the database.')
    note(orders.detail)
    return false
  }
  ok('`orders` table found')

  const tax = await probe(url, key, 'orders', 'tax_percent,total')
  if (tax.state === 'ok') {
    ok('tax columns present')
  } else if (tax.state === 'missing-column') {
    bad('`orders` is missing the tax columns — this is an older schema.')
    note('Re-run supabase/schema.sql; it is safe to run again.')
    return false
  } else {
    // Do not blame the schema for what is actually a dropped connection.
    bad('Could not check the tax columns.')
    note(tax.detail ?? tax.state)
    return false
  }

  const soldOut = await probe(url, key, 'unavailable_items', 'item_id')
  if (soldOut.state === 'ok') {
    ok('`unavailable_items` table found')
  } else if (soldOut.state === 'missing-table') {
    bad('`unavailable_items` does not exist — sold-out will not work.')
    note('Re-run supabase/schema.sql; it is safe to run again.')
    return false
  } else {
    bad('Could not check the sold-out table.')
    note(soldOut.detail ?? soldOut.state)
    return false
  }

  return true
}

async function offerSchema(ref, url, key) {
  const sql = await readFile(SCHEMA_PATH, 'utf8')

  heading('Applying the schema')
  say('  Two ways. The first always works.')
  say()
  say(`  ${bold('1. Paste it in yourself')}`)
  note(`Open ${ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : 'the Supabase SQL editor'}`)
  note(`Paste all of supabase/schema.sql and press Run.`)
  say()
  say(`  ${bold('2. Let this script run it')}`)
  note('Needs a personal access token: Account → Access Tokens → Generate new token.')
  note('The token is used once, for this call, and is never written to disk.')
  say()

  if (!ref) {
    warn('Cannot use route 2 without a *.supabase.co URL — the project ref is unknown.')
    return false
  }

  const auto = await confirm('Run the schema now with an access token?', false)
  if (!auto) {
    say()
    note('Paste the SQL in, then re-check with: npm run setup -- --check')
    return false
  }

  const token = await ask('Personal access token', {
    secret: true,
    hint: 'Starts with sbp_. Hidden as you type.',
  })
  if (!token) {
    bad('No token given.')
    return false
  }

  say()
  say(dim('  Running schema.sql…'))
  const result = await applySchema(ref, token, sql)
  if (!result.ok) {
    bad('The Management API refused that.')
    note(result.detail)
    note('Paste the SQL in by hand instead — route 1 above.')
    return false
  }
  ok('Schema applied')
  return verify(url, key)
}

async function main() {
  say()
  say(bold('  TEA CONTENT MANSION'))
  say(dim('  Supabase setup'))

  const previous = await readEnv()

  if (CHECK_ONLY) {
    const url = previous.VITE_SUPABASE_URL
    const key = previous.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      say()
      bad('No database configured in .env.local.')
      note('Run `npm run setup` to configure one.')
      process.exit(1)
    }
    const good = await verify(url, key)
    say()
    process.exit(good ? 0 : 1)
  }

  openInput()

  if (Object.keys(previous).length) {
    say()
    note('Found an existing .env.local — press Enter to keep any current value.')
  }

  heading('The order database')
  say('  Supabase dashboard → your project → Project Settings → API.')
  say()

  const url = await askValidated('Project URL', checkUrl, {
    fallback: previous.VITE_SUPABASE_URL,
    hint: 'e.g. https://abcdefgh.supabase.co',
  })

  const key = await askValidated('Anon public key', checkKey, {
    fallback: previous.VITE_SUPABASE_ANON_KEY,
    hint: 'The "anon public" one. Not service_role — that would go to every customer.',
  })

  heading('GST')
  say('  Blank keeps the printed card\'s "GST extra, as applicable".')
  say('  A number adds a GST line and a total to pay on every bill.')
  say()
  warn('Get the rate from the café\'s accountant. Do not guess on their behalf.')
  say()

  const gst = await askValidated('GST percent', checkGst, {
    fallback: previous.VITE_GST_PERCENT,
    hint: 'e.g. 5 — or blank',
  })

  heading('Kitchen pass code')
  say('  Asked for once per device before ?view=admin will show orders.')
  say()

  const pin = await askValidated('Pass code', checkPin, {
    fallback: previous.VITE_PASS_PIN,
    hint: '3–12 letters or digits — or blank for no code',
  })

  const values = {
    VITE_SUPABASE_URL: url.value,
    VITE_SUPABASE_ANON_KEY: key.value,
    VITE_GST_PERCENT: gst.value,
    VITE_PASS_PIN: pin.value,
  }

  heading('Writing .env.local')
  await writeEnv(values, previous)
  ok('.env.local written')
  note(`URL          ${values.VITE_SUPABASE_URL}`)
  note(`Key          ${mask(values.VITE_SUPABASE_ANON_KEY)}`)
  note(`GST          ${values.VITE_GST_PERCENT ? `${values.VITE_GST_PERCENT}%` : 'not set — "GST extra, as applicable"'}`)
  note(`Pass code    ${values.VITE_PASS_PIN ? 'set' : 'none — the pass is open'}`)

  let ready = await verify(values.VITE_SUPABASE_URL, values.VITE_SUPABASE_ANON_KEY)

  if (!ready) {
    ready = await offerSchema(url.ref, values.VITE_SUPABASE_URL, values.VITE_SUPABASE_ANON_KEY)
  }

  heading(ready ? 'Ready' : 'Not finished')

  if (ready) {
    say('  Orders will now cross devices.')
    say()
    say(`  ${bold('1.')} Restart the dev server — Vite reads these at startup:`)
    note('npm run dev')
    say(`  ${bold('2.')} Open the pass on this machine:`)
    note('http://localhost:5173/?view=admin')
    say(`  ${bold('3.')} On your phone, on the same Wi-Fi, open your LAN address:`)
    note('http://192.168.x.x:5173/?table=4    (ipconfig → IPv4 Address)')
    say(`  ${bold('4.')} Order on the phone. It should land on the pass in about a second.`)
    say()
    say(`  The pass header should read ${green('Live')}, not "This device only".`)
    say()
    note('Deploying? The same values go in your host\'s dashboard — DEPLOY.md section 5.')
  } else {
    say('  The settings are saved, but the database is not ready yet.')
    say()
    say(`  ${bold('1.')} Apply supabase/schema.sql in the Supabase SQL editor.`)
    say(`  ${bold('2.')} Check it: ${bold('npm run setup -- --check')}`)
  }
  say()
}

// Only run when invoked directly, so the validators above can be imported and
// tested without the script trying to prompt.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  try {
    await main()
  } catch (cause) {
    say()
    bad('The setup stopped.')
    note(cause?.stack ?? String(cause))
    process.exitCode = 1
  } finally {
    rl?.close()
  }
}
