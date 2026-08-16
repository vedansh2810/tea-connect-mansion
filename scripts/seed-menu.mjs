/**
 * Seed the Supabase menu tables from the static menu.js data.
 *
 * Usage:
 *   node scripts/seed-menu.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or as
 * environment variables. Safe to re-run — uses upsert so existing rows
 * are updated rather than duplicated.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env manually (no dotenv dependency)
for (const envFile of ['.env.local', '.env']) {
  try {
    const envPath = resolve(__dirname, '..', envFile)
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^(VITE_[A-Z_]+)\s*=\s*(.*)$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
    })
  } catch {
    // file not found — try the next one
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  console.error('Set them in .env or as environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// We can't import the ES module menu.js directly in Node without Vite,
// so we'll read and evaluate it. The menu.js file exports MENU which is
// the hierarchical structure we need.
//
// Instead of trying to parse the ES module, we'll construct the seed data
// from the known menu structure. This script should be run after the
// schema has been applied.

// Import the menu data — this works because the menu.js uses standard ES
// module syntax that Node supports.
const menuModule = await import(pathToFileURL(resolve(__dirname, '..', 'src', 'data', 'menu.js')).href)
const MENU = menuModule.MENU

async function seed() {
  console.log('Seeding menu data into Supabase...\n')

  let sectionCount = 0
  let groupCount = 0
  let itemCount = 0

  for (const [si, section] of MENU.entries()) {
    // Upsert section
    const { error: sErr } = await supabase.from('menu_sections').upsert({
      id: section.id,
      name: section.name,
      kicker: section.kicker ?? null,
      note: section.note ?? null,
      sort_order: si,
    })
    if (sErr) {
      console.error(`  ✗ Section "${section.name}":`, sErr.message)
      continue
    }
    sectionCount++
    console.log(`  ✓ Section: ${section.name}`)

    for (const [gi, group] of section.groups.entries()) {
      const { error: gErr } = await supabase.from('menu_groups').upsert({
        id: group.id,
        section_id: section.id,
        name: group.name,
        tiers: group.tiers ?? null,
        add_on: group.addOn ?? null,
        footnote: group.footnote ?? null,
        sort_order: gi,
      })
      if (gErr) {
        console.error(`    ✗ Group "${group.name}":`, gErr.message)
        continue
      }
      groupCount++

      for (const [ii, item] of group.items.entries()) {
        const { error: iErr } = await supabase.from('menu_items').upsert({
          id: item.id,
          group_id: group.id,
          name: item.name,
          price: item.price ?? null,
          prices: item.prices ?? null,
          note: item.note ?? null,
          choices: item.choices ?? null,
          chef: item.chef ?? false,
          is_available: true,
          sort_order: ii,
        })
        if (iErr) {
          console.error(`      ✗ Item "${item.name}":`, iErr.message)
          continue
        }
        itemCount++
      }
    }
  }

  console.log(`\nDone! Seeded ${sectionCount} sections, ${groupCount} groups, ${itemCount} items.`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
