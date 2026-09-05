// load-test-realtime-connections.mjs
// Simulates 120+ concurrent devices each holding a Supabase Realtime WS connection
// and placing orders at realistic intervals. Clearly exceeds the free-tier 60 limit.

import axios from 'axios';
import { WebSocket } from 'ws';

// ===== USER CONFIG ====================================================
const SUPABASE_URL = 'https://irgtlnenopfcuuawfhhe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZ3RsbmVub3BmY3V1YXdmaGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NzQ0MTQsImV4cCI6MjEwMjQ1MDQxNH0.Z6g9ucXsHI5k8mNc_FZASmyOFRtECKB5YuuDFe6IvUk';

const TOTAL_VIRTUAL_USERS = 120; // Well above the 60-connection limit
const TEST_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const ORDER_INTERVAL_MIN_MS = 20 * 1000;
const ORDER_INTERVAL_MAX_MS = 60 * 1000;
// ===================================================================

// ===== LIVE COUNTERS =================================================
const stats = {
  wsConnected: 0,
  wsFailed: 0,
  ordersPlaced: 0,
  ordersFailed: 0,
  wsClosed: 0,
  maxConcurrent: 0,
  errors: [],
};

// ===== HELPERS =======================================================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MENU_ITEMS = [
  { name: 'Adrak Chai', price: 30 },
  { name: 'Masala Chai', price: 30 },
  { name: 'Samosa', price: 25 },
  { name: 'Vada Pav', price: 35 },
  { name: 'Paneer Tikka', price: 180 },
  { name: 'Veg Biryani', price: 150 },
  { name: 'Mango Lassi', price: 60 },
  { name: 'French Fries', price: 90 },
];

function generateOrderLines() {
  const lines = [];
  const itemCount = randomInt(1, 3);
  let subtotal = 0;
  for (let i = 0; i < itemCount; i++) {
    const item = randomElement(MENU_ITEMS);
    const qty = randomInt(1, 3);
    lines.push({ name: item.name, qty, unitPrice: item.price });
    subtotal += qty * item.price;
  }
  return { lines, subtotal };
}

function randomCustomer() {
  const first = ['Arjun','Priya','Sneha','Vikram','Anita','Rohan','Kavita','Sameer','Deepa','Manoj','Neha','Rahul'];
  const last = ['Sharma','Patel','Singh','Kumar','Desai','Iyer','Reddy','Gupta','Nair','Joshi'];
  return randomElement(first) + ' ' + randomElement(last);
}
function randomPhone() {
  return '9' + String(100000000 + randomInt(0, 899999999)).padStart(9, '0');
}

const ORDERS_ENDPOINT = `${SUPABASE_URL}/rest/v1/orders`;

async function placeOrder(userId, tableId) {
  const { lines, subtotal } = generateOrderLines();
  const taxPercent = 5;
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const total = subtotal + taxAmount;

  const payload = {
    table_label: String(tableId),
    lines, note: `Load test — user ${userId}`,
    subtotal, tax_percent: taxPercent, tax_amount: taxAmount, total,
    customer_name: randomCustomer(), customer_phone: randomPhone(),
  };

  try {
    const r = await axios.post(ORDERS_ENDPOINT, payload, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    stats.ordersPlaced++;
    return true;
  } catch (error) {
    stats.ordersFailed++;
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    stats.errors.push({ userId, tableId, status, msg });
    return false;
  }
}

// ===== SIMULATED DEVICE ==============================================
class SimulatedDevice {
  constructor(userId) {
    this.userId = userId;
    this.tableId = randomInt(1, 100);
    this.ws = null;
    this.isConnected = false;
    this.orderTimer = null;
    this.stopRequested = false;
  }

  async connect() {
    try {
      const wsUrl = `${SUPABASE_URL.replace(/^https/, 'wss')}/realtime/v1/websocket?vsn=1.0.0&apikey=${encodeURIComponent(SUPABASE_KEY)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        stats.wsConnected++;
        if (stats.wsConnected > stats.maxConcurrent) stats.maxConcurrent = stats.wsConnected;
        console.log(`[User ${String(this.userId).padStart(3)}] ✅ WS connected  (table ${this.tableId})  | live: ${stats.wsConnected} | max: ${stats.maxConcurrent}`);

        // Join the orders-feed channel (mimics real client behavior)
        this.ws.send(JSON.stringify({
          topic: 'realtime:orders-feed',
          event: 'phx_join',
          payload: {},
          ref: '1',
        }));
      });

      this.ws.on('message', () => {}); // keep-alive

      this.ws.on('close', () => {
        this.isConnected = false;
        stats.wsClosed++;
        if (stats.wsConnected > 0) stats.wsConnected--;
        console.log(`[User ${String(this.userId).padStart(3)}] ⛔ WS closed   | live: ${stats.wsConnected}`);
        if (this.orderTimer) { clearInterval(this.orderTimer); this.orderTimer = null; }
      });

      this.ws.on('error', (err) => {
        stats.wsFailed++;
        if (stats.wsConnected > 0) stats.wsConnected--;
        console.warn(`[User ${String(this.userId).padStart(3)}] ❌ WS error: ${err.message}  | live: ${stats.wsConnected}`);
        this.isConnected = false;
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WS timeout')), 10000);
        this.ws.once('open', () => { clearTimeout(timeout); resolve(); });
        this.ws.once('error', (e) => { clearTimeout(timeout); reject(e); });
        this.ws.once('close', () => { clearTimeout(timeout); reject(new Error('closed before open')); });
      });

      // Stagger order placement
      const initialDelay = randomInt(5000, 30000);
      setTimeout(() => this.startOrdering(), initialDelay);
    } catch (err) {
      stats.wsFailed++;
      console.error(`[User ${String(this.userId).padStart(3)}] ❌ FAILED: ${err.message}  | live: ${stats.wsConnected}`);
      this.isConnected = false;
    }
  }

  startOrdering() {
    if (this.stopRequested) return;
    this.placeOrderLoop();
    this.orderTimer = setInterval(() => {
      if (this.stopRequested) { clearInterval(this.orderTimer); return; }
      this.placeOrderLoop();
    }, randomInt(ORDER_INTERVAL_MIN_MS, ORDER_INTERVAL_MAX_MS));
  }

  placeOrderLoop() {
    if (!this.isConnected || this.stopRequested) return;
    placeOrder(this.userId, this.tableId).catch(() => {});
  }

  disconnect() {
    this.stopRequested = true;
    if (this.orderTimer) { clearInterval(this.orderTimer); this.orderTimer = null; }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();
    this.isConnected = false;
  }
}

// ===== MAIN ==========================================================
async function runLoadTest() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Realtime + REST Load Test — Tea Connect Mansion       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Virtual devices : ${String(TOTAL_VIRTUAL_USERS).padStart(3)}                               ║`);
  console.log(`║  Test duration   : ${TEST_DURATION_MS / 60000} minutes                               ║`);
  console.log(`║  Order frequency : every ${ORDER_INTERVAL_MIN_MS/1000}–${ORDER_INTERVAL_MAX_MS/1000}s                        ║`);
  console.log(`║  Free-tier limit : 60 connections                      ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('👉  OPEN YOUR SUPABASE DASHBOARD NOW:');
  console.log('    Project → Database → Connection pool → "Active connections"');
  console.log('    Watch the number climb as devices connect.');
  console.log('');
  console.log('    Also check: Project → API → Logs → PostgREST');
  console.log('    You will see errors appear when the limit is hit.');
  console.log('');
  console.log('Starting in 5 seconds...\n');

  for (let i = 5; i > 0; i--) {
    process.stdout.write(`${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('🚀 GO!\n');

  const startTime = Date.now();
  const devices = [];

  // Create all devices
  for (let i = 1; i <= TOTAL_VIRTUAL_USERS; i++) {
    const device = new SimulatedDevice(i);
    devices.push(device);
    // Stagger connections by 100ms each to avoid a single burst
    setTimeout(() => device.connect(), i * 100);
    if (i % 20 === 0) await new Promise(r => setTimeout(r, 500));
  }

  // Live stats banner every 15 seconds
  const banner = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`\n⏱  [${elapsed}s] Live: ${stats.wsConnected} connected | Max: ${stats.maxConcurrent} | WS fail: ${stats.wsFailed} | Orders OK: ${stats.ordersPlaced} | Orders fail: ${stats.ordersFailed}\n`);
  }, 15_000);

  // Wait for test duration
  await new Promise(r => setTimeout(r, TEST_DURATION_MS));
  clearInterval(banner);

  console.log('\n⏰ Test duration elapsed. Disconnecting all devices...');
  devices.forEach(d => d.disconnect());

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Count unique errors
  const uniqueErrors = [...new Set(stats.errors.map(e => e.status))];

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                   TEST RESULTS                         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Duration          : ${durationSec.padStart(6)} seconds                        ║`);
  console.log(`║  Total devices     : ${String(TOTAL_VIRTUAL_USERS).padStart(3)}                               ║`);
  console.log(`║  WS connected OK   : ${String(stats.wsConnected + stats.wsClosed).padStart(3)}                               ║`);
  console.log(`║  WS failed         : ${String(stats.wsFailed).padStart(3)}                               ║`);
  console.log(`║  Max concurrent WS : ${String(stats.maxConcurrent).padStart(3)}                               ║`);
  console.log(`║  Orders placed OK  : ${String(stats.ordersPlaced).padStart(3)}                               ║`);
  console.log(`║  Orders failed     : ${String(stats.ordersFailed).padStart(3)}                               ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');

  if (stats.maxConcurrent < TOTAL_VIRTUAL_USERS) {
    console.log(`║  ⚠️  CONNECTION LIMIT HIT at ~${stats.maxConcurrent} devices              ║`);
    console.log(`║     Free-tier limit was reached before all ${TOTAL_VIRTUAL_USERS} devices   ║`);
    console.log('║     could connect. Upgrade your Supabase plan to       ║');
    console.log('║     support more concurrent users.                     ║');
  } else {
    console.log(`║  ✅ All ${TOTAL_VIRTUAL_USERS} devices connected successfully           ║`);
    console.log('║     You have headroom on the free tier.                ║');
  }

  if (stats.ordersFailed > 0) {
    console.log(`║  ⚠️  ${stats.ordersFailed} orders failed (rate limiting / DB pool)       ║`);
  }

  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 CHECK YOUR SUPABASE DASHBOARD:');
  console.log('   1. Database → Connection pool → Peak connections');
  console.log('   2. Logs → API → Look for 429 / 500 / timeout errors');
  console.log('   3. Orders table → count total test orders');
  console.log('');

  process.exit(0);
}

process.on('SIGINT', () => { console.log('\n🛑 Interrupted.'); process.exit(0); });

runLoadTest().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
