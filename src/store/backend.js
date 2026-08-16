/**
 * Where orders live.
 *
 * Two adapters behind one interface:
 *
 *   cloud — Supabase Postgres with realtime. Orders cross devices, so a
 *           customer's phone reaches the kitchen tablet. This is what a real
 *           dining room needs.
 *   local — localStorage with a BroadcastChannel. One browser profile only.
 *           Fine for a single-tablet setup or a walkthrough on one machine.
 *
 * Cloud switches on by itself when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * are present at build time. Nothing else in the app knows which one is active
 * — it asks `backend.mode` only so the pass can say so out loud.
 *
 * The Supabase client is imported dynamically, so a local-only build never
 * downloads it.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

/* ── local ──────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'tcm.orders.v1'
const SOLD_OUT_KEY = 'tcm.unavailable.v1'
const CHANNEL_NAME = 'tcm.orders'

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* Private mode or quota. In-memory state still drives this tab. */
  }
}

const readLocal = () => readJson(STORAGE_KEY)
const writeLocal = (orders) => writeJson(STORAGE_KEY, orders)

const localBackend = {
  mode: 'local',

  async list() {
    return readLocal()
  },

  async place({ table, lines, note, subtotal, taxPercent, taxAmount, total }) {
    const existing = readLocal()
    // Sequential, the way a paper bill book runs.
    const seq = existing.reduce((max, order) => Math.max(max, order.seq ?? 0), 0) + 1
    const at = new Date().toISOString()
    const order = {
      id: `TCM-${String(seq).padStart(4, '0')}`,
      seq,
      table: String(table),
      lines,
      note: note?.trim() || '',
      subtotal,
      // Stored on the order, not recomputed later: a rate change next month
      // must not silently rewrite what a customer was quoted today.
      taxPercent: taxPercent ?? 0,
      taxAmount: taxAmount ?? 0,
      total: total ?? subtotal,
      status: 'pending',
      placedAt: at,
      history: [{ status: 'pending', at }],
    }
    writeLocal([order, ...existing])
    this.announce()
    return order
  },

  async update(orderId, patch) {
    writeLocal(readLocal().map((order) => (order.id === orderId ? { ...order, ...patch } : order)))
    this.announce()
  },

  async removeCompleted() {
    writeLocal(readLocal().filter((order) => order.status !== 'completed'))
    this.announce()
  },

  async removeAll() {
    writeLocal([])
    this.announce()
  },

  /* ── sold out ─────────────────────────────────────────────────────────── */

  async listUnavailable() {
    return readJson(SOLD_OUT_KEY)
  },

  async setUnavailable(itemId, unavailable) {
    const current = new Set(readJson(SOLD_OUT_KEY))
    if (unavailable) current.add(itemId)
    else current.delete(itemId)
    writeJson(SOLD_OUT_KEY, [...current])
    this.announce('availability')
  },

  async clearUnavailable() {
    writeJson(SOLD_OUT_KEY, [])
    this.announce('availability')
  },

  /* ── notification ─────────────────────────────────────────────────────── */

  channel: null,
  listeners: { orders: new Set(), availability: new Set() },

  announce(topic = 'orders') {
    this.channel?.postMessage(topic)
    // Same-tab listeners: BroadcastChannel does not echo to its own sender.
    this.listeners[topic]?.forEach((fn) => fn())
  },

  /** One channel, two topics, so the two stores stay independent. */
  listen(topic, onChange) {
    if (!this.channel && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.addEventListener('message', (event) => {
        const which = event.data === 'availability' ? 'availability' : 'orders'
        this.listeners[which].forEach((fn) => fn())
      })
    }

    this.listeners[topic].add(onChange)

    const watched = topic === 'availability' ? SOLD_OUT_KEY : STORAGE_KEY
    const onStorage = (event) => {
      if (event.key === watched) onChange()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
      this.listeners[topic].delete(onChange)
    }
  },

  subscribe(onChange) {
    return this.listen('orders', onChange)
  },

  subscribeAvailability(onChange) {
    return this.listen('availability', onChange)
  },
}

/* ── cloud ──────────────────────────────────────────────────────────────── */

let clientPromise = null

function client() {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } },
      }),
    )
  }
  return clientPromise
}

/** Database row → the shape every component already expects. */
function fromRow(row) {
  return {
    id: row.id,
    seq: row.seq,
    table: row.table_label,
    lines: row.lines,
    note: row.note ?? '',
    subtotal: row.subtotal,
    taxPercent: Number(row.tax_percent ?? 0),
    taxAmount: row.tax_amount ?? 0,
    // Older rows predate the tax columns; their total is the subtotal.
    total: row.total ?? row.subtotal,
    status: row.status,
    placedAt: row.placed_at,
    history: row.history ?? [],
  }
}

const cloudBackend = {
  mode: 'cloud',

  async list() {
    const supabase = await client()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('placed_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return data.map(fromRow)
  },

  async place({ table, lines, note, subtotal, taxPercent, taxAmount, total }) {
    const supabase = await client()
    const { data, error } = await supabase
      .from('orders')
      .insert({
        table_label: String(table),
        lines,
        note: note?.trim() || '',
        subtotal,
        tax_percent: taxPercent ?? 0,
        tax_amount: taxAmount ?? 0,
        total: total ?? subtotal,
      })
      .select()
      .single()
    if (error) throw error
    return fromRow(data)
  },

  async update(orderId, patch) {
    const supabase = await client()
    const row = {}
    if (patch.status) row.status = patch.status
    if (patch.history) row.history = patch.history
    const { error } = await supabase.from('orders').update(row).eq('id', orderId)
    if (error) throw error
  },

  async removeCompleted() {
    const supabase = await client()
    const { error } = await supabase.from('orders').delete().eq('status', 'completed')
    if (error) throw error
  },

  async removeAll() {
    const supabase = await client()
    const { error } = await supabase.from('orders').delete().neq('id', '')
    if (error) throw error
  },

  /* ── sold out ─────────────────────────────────────────────────────────── */

  async listUnavailable() {
    const supabase = await client()
    const { data, error } = await supabase.from('unavailable_items').select('item_id')
    if (error) throw error
    return data.map((row) => row.item_id)
  },

  async setUnavailable(itemId, unavailable) {
    const supabase = await client()
    const { error } = unavailable
      ? await supabase.from('unavailable_items').upsert({ item_id: itemId })
      : await supabase.from('unavailable_items').delete().eq('item_id', itemId)
    if (error) throw error
  },

  async clearUnavailable() {
    const supabase = await client()
    const { error } = await supabase.from('unavailable_items').delete().neq('item_id', '')
    if (error) throw error
  },

  /* ── notification ─────────────────────────────────────────────────────── */

  watch(name, table, onChange) {
    let channel = null
    let cancelled = false

    client().then((supabase) => {
      if (cancelled) return
      channel = supabase
        .channel(name)
        .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) client().then((supabase) => supabase.removeChannel(channel))
    }
  },

  subscribe(onChange) {
    return this.watch('orders-feed', 'orders', onChange)
  },

  subscribeAvailability(onChange) {
    return this.watch('availability-feed', 'unavailable_items', onChange)
  },
}

export const backend = isCloudConfigured ? cloudBackend : localBackend
