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
const WAITER_KEY = 'tcm.waiter.v1'
const AUDIT_KEY = 'tcm.audit.v1'
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

  async place({ table, lines, note, subtotal, taxPercent, taxAmount, total, customerName, customerPhone }) {
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
      customerName: customerName?.trim() || '',
      customerPhone: customerPhone?.trim() || '',
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

  async updateOrderLines(orderId, lines, subtotal, taxAmount, total) {
    writeLocal(
      readLocal().map((order) =>
        order.id === orderId ? { ...order, lines, subtotal, taxAmount, total } : order,
      ),
    )
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

  /* ── audit log ───────────────────────────────────────────────────────── */

  async logAudit(orderId, action, detail) {
    const log = readJson(AUDIT_KEY)
    log.push({ id: log.length + 1, orderId, action, detail, createdAt: new Date().toISOString() })
    writeJson(AUDIT_KEY, log)
  },

  async listAudit(orderId) {
    return readJson(AUDIT_KEY).filter((entry) => entry.orderId === orderId)
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

  /* ── waiter calls ────────────────────────────────────────────────────── */

  async placeWaiterCall(table) {
    const calls = readJson(WAITER_KEY)
    const call = {
      id: calls.reduce((max, c) => Math.max(max, c.id ?? 0), 0) + 1,
      table: String(table),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    writeJson(WAITER_KEY, [call, ...calls])
    this.announce('waiter')
    return call
  },

  async listWaiterCalls() {
    return readJson(WAITER_KEY).filter((c) => c.status === 'pending')
  },

  async updateWaiterCall(callId, status) {
    writeJson(
      WAITER_KEY,
      readJson(WAITER_KEY).map((c) => (c.id === callId ? { ...c, status } : c)),
    )
    this.announce('waiter')
  },

  /* ── menu (local uses static data — no DB) ───────────────────────────── */

  async listMenu() {
    return null // signals MenuContext to use static fallback
  },

  async updateMenuItem(itemId, patch) {
    // No-op in local mode
  },

  async createMenuItem(item) {
    // No-op in local mode
  },

  async deleteMenuItem(itemId) {
    // No-op in local mode
  },

  async updateMenuGroup(groupId, patch) {},
  async createMenuGroup(group) {},
  async deleteMenuGroup(groupId) {},

  async updateMenuSection(sectionId, patch) {},
  async createMenuSection(section) {},
  async deleteMenuSection(sectionId) {},

  /* ── analytics ───────────────────────────────────────────────────────── */

  async queryAnalytics(dateFrom, dateTo) {
    const orders = readLocal().filter((o) => {
      const t = new Date(o.placedAt).getTime()
      return t >= new Date(dateFrom).getTime() && t <= new Date(dateTo).getTime()
    })
    return buildAnalyticsFromOrders(orders)
  },

  /* ── notification ─────────────────────────────────────────────────────── */

  channel: null,
  listeners: { orders: new Set(), availability: new Set(), waiter: new Set(), menu: new Set() },

  announce(topic = 'orders') {
    this.channel?.postMessage(topic)
    // Same-tab listeners: BroadcastChannel does not echo to its own sender.
    this.listeners[topic]?.forEach((fn) => fn())
  },

  /** One channel, multiple topics, so the stores stay independent. */
  listen(topic, onChange) {
    if (!this.channel && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.addEventListener('message', (event) => {
        const which = ['availability', 'waiter', 'menu'].includes(event.data) ? event.data : 'orders'
        this.listeners[which].forEach((fn) => fn())
      })
    }

    this.listeners[topic].add(onChange)

    const keyMap = { availability: SOLD_OUT_KEY, waiter: WAITER_KEY, orders: STORAGE_KEY }
    const watched = keyMap[topic] || STORAGE_KEY
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

  subscribeWaiterCalls(onChange) {
    return this.listen('waiter', onChange)
  },

  subscribeMenu(onChange) {
    return this.listen('menu', onChange)
  },
}

/* ── Analytics helper (shared by both backends) ────────────────────────── */

function buildAnalyticsFromOrders(orders) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? o.subtotal ?? 0), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0

  // Item popularity
  const itemMap = {}
  orders.forEach((o) => {
    ;(o.lines || []).forEach((line) => {
      const key = line.name || line.itemId
      if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, revenue: 0 }
      itemMap[key].qty += line.qty
      itemMap[key].revenue += line.qty * line.unitPrice
    })
  })
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15)

  // Orders by hour
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, revenue: 0 }))
  orders.forEach((o) => {
    const h = new Date(o.placedAt).getHours()
    hourly[h].count += 1
    hourly[h].revenue += o.total ?? o.subtotal ?? 0
  })

  // Table performance
  const tableMap = {}
  orders.forEach((o) => {
    const t = o.table
    if (!tableMap[t]) tableMap[t] = { table: t, orders: 0, revenue: 0 }
    tableMap[t].orders += 1
    tableMap[t].revenue += o.total ?? o.subtotal ?? 0
  })
  const tables = Object.values(tableMap).sort((a, b) => b.revenue - a.revenue)

  // Status breakdown
  const statusBreakdown = { pending: 0, preparing: 0, served: 0, completed: 0 }
  orders.forEach((o) => {
    if (statusBreakdown[o.status] !== undefined) statusBreakdown[o.status] += 1
  })

  return { totalRevenue, totalOrders, avgOrderValue, topItems, hourly, tables, statusBreakdown }
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
    customerName: row.customer_name ?? '',
    customerPhone: row.customer_phone ?? '',
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

  async place({ table, lines, note, subtotal, taxPercent, taxAmount, total, customerName, customerPhone }) {
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
        customer_name: customerName?.trim() || '',
        customer_phone: customerPhone?.trim() || '',
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

  async updateOrderLines(orderId, lines, subtotal, taxAmount, total) {
    const supabase = await client()
    const { error } = await supabase
      .from('orders')
      .update({ lines, subtotal, tax_amount: taxAmount, total })
      .eq('id', orderId)
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

  /* ── audit log ───────────────────────────────────────────────────────── */

  async logAudit(orderId, action, detail) {
    const supabase = await client()
    const { error } = await supabase
      .from('order_audit_log')
      .insert({ order_id: orderId, action, detail })
    if (error) throw error
  },

  async listAudit(orderId) {
    const supabase = await client()
    const { data, error } = await supabase
      .from('order_audit_log')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      action: r.action,
      detail: r.detail,
      createdAt: r.created_at,
    }))
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

  /* ── waiter calls ────────────────────────────────────────────────────── */

  async placeWaiterCall(table) {
    const supabase = await client()
    const { data, error } = await supabase
      .from('waiter_calls')
      .insert({ table_label: String(table) })
      .select()
      .single()
    if (error) throw error
    return { id: data.id, table: data.table_label, status: data.status, createdAt: data.created_at }
  },

  async listWaiterCalls() {
    const supabase = await client()
    const { data, error } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((r) => ({
      id: r.id,
      table: r.table_label,
      status: r.status,
      createdAt: r.created_at,
    }))
  },

  async updateWaiterCall(callId, status) {
    const supabase = await client()
    const { error } = await supabase.from('waiter_calls').update({ status }).eq('id', callId)
    if (error) throw error
  },

  /* ── menu CRUD ───────────────────────────────────────────────────────── */

  async listMenu() {
    const supabase = await client()
    const [sectionsRes, groupsRes, itemsRes] = await Promise.all([
      supabase.from('menu_sections').select('*').order('sort_order'),
      supabase.from('menu_groups').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('sort_order'),
    ])
    if (sectionsRes.error) throw sectionsRes.error
    if (groupsRes.error) throw groupsRes.error
    if (itemsRes.error) throw itemsRes.error

    // Empty tables means not seeded yet — signal fallback
    if (!sectionsRes.data.length) return null

    // Reassemble the hierarchical shape components expect
    const groupsBySection = {}
    groupsRes.data.forEach((g) => {
      if (!groupsBySection[g.section_id]) groupsBySection[g.section_id] = []
      groupsBySection[g.section_id].push(g)
    })

    const itemsByGroup = {}
    itemsRes.data.forEach((i) => {
      if (!itemsByGroup[i.group_id]) itemsByGroup[i.group_id] = []
      itemsByGroup[i.group_id].push(i)
    })

    return sectionsRes.data.map((s) => ({
      id: s.id,
      name: s.name,
      kicker: s.kicker,
      note: s.note,
      groups: (groupsBySection[s.id] || []).map((g) => ({
        id: g.id,
        name: g.name,
        tiers: g.tiers,
        addOn: g.add_on,
        footnote: g.footnote,
        items: (itemsByGroup[g.id] || [])
          .filter((i) => i.is_available !== false)
          .map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            prices: i.prices,
            note: i.note,
            choices: i.choices,
            chef: i.chef,
          })),
      })),
    }))
  },

  async updateMenuItem(itemId, patch) {
    const supabase = await client()
    const { error } = await supabase.from('menu_items').update(patch).eq('id', itemId)
    if (error) throw error
  },

  async createMenuItem(item) {
    const supabase = await client()
    const { error } = await supabase.from('menu_items').insert(item)
    if (error) throw error
  },

  async deleteMenuItem(itemId) {
    const supabase = await client()
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
    if (error) throw error
  },

  async updateMenuGroup(groupId, patch) {
    const supabase = await client()
    const { error } = await supabase.from('menu_groups').update(patch).eq('id', groupId)
    if (error) throw error
  },

  async createMenuGroup(group) {
    const supabase = await client()
    const { error } = await supabase.from('menu_groups').insert(group)
    if (error) throw error
  },

  async deleteMenuGroup(groupId) {
    const supabase = await client()
    const { error } = await supabase.from('menu_groups').delete().eq('id', groupId)
    if (error) throw error
  },

  async updateMenuSection(sectionId, patch) {
    const supabase = await client()
    const { error } = await supabase.from('menu_sections').update(patch).eq('id', sectionId)
    if (error) throw error
  },

  async createMenuSection(section) {
    const supabase = await client()
    const { error } = await supabase.from('menu_sections').insert(section)
    if (error) throw error
  },

  async deleteMenuSection(sectionId) {
    const supabase = await client()
    const { error } = await supabase.from('menu_sections').delete().eq('id', sectionId)
    if (error) throw error
  },

  /* ── analytics ───────────────────────────────────────────────────────── */

  async queryAnalytics(dateFrom, dateTo) {
    const supabase = await client()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('placed_at', dateFrom)
      .lte('placed_at', dateTo)
      .order('placed_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    return buildAnalyticsFromOrders(data.map(fromRow))
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

  subscribeWaiterCalls(onChange) {
    return this.watch('waiter-calls-feed', 'waiter_calls', onChange)
  },

  subscribeMenu(onChange) {
    // Watch all three menu tables
    let channels = []
    let cancelled = false

    client().then((supabase) => {
      if (cancelled) return
      ;['menu_sections', 'menu_groups', 'menu_items'].forEach((table, i) => {
        const ch = supabase
          .channel(`menu-feed-${i}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
          .subscribe()
        channels.push(ch)
      })
    })

    return () => {
      cancelled = true
      if (channels.length)
        client().then((supabase) => channels.forEach((ch) => supabase.removeChannel(ch)))
    }
  },
}

export const backend = isCloudConfigured ? cloudBackend : localBackend
