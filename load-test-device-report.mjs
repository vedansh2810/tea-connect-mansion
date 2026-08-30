// load-test-realtime-connections.mjs
// Simulates many concurrent devices each holding a Supabase Realtime WS connection
// and placing orders at realistic intervals. Used to find the practical concurrent
// user limit of the Supabase free tier (60 connections).

import axios from 'axios';
import { WebSocket } from 'ws';

// ===== USER CONFIG ====================================================
const SUPABASE_URL = 'https://irgtlnenopfcuuawfhhe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZ3RsbmVub3BmY3V1YXdmaGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NzQ0MTQsImV4cCI6MjEwMjQ1MDQxNH0.Z6g9ucXsHI5k8mNc_FZASmyOFRtECKB5YuuDFe6IvUk';

// Target: try to exceed the free-tier limit of 60 concurrent connections
const TOTAL_VIRTUAL_USERS = 80; // Number of simulated devices (phones/tablets)
// Each simulated device will keep its WS connection open for the entire test.
const TEST_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Each device will place an order every ORDER_INTERVAL_MS (randomized)
const ORDER_INTERVAL_MIN_MS = 20 * 1000; // 20 seconds
const ORDER_INTERVAL_MAX_MS = 60 * 1000; // 60 seconds
// ===================================================================

// ===== HELPERS ======================================================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Realistic menu items (subset)
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
  const itemCount = randomInt(1, 3); // 1-3 line items per order
  let subtotal = 0;
  for (let i = 0; i < itemCount; i++) {
    const item = randomElement(MENU_ITEMS);
    const qty = randomInt(1, 3);
    lines.push({
      name: item.name,
      qty: qty,
      unitPrice: item.price,
    });
    subtotal += qty * item.price;
  }
  return { lines, subtotal };
}

// Generates a plausible customer name and phone
function randomCustomer() {
  const firstNames = ['Arjun', 'Priya', 'Sneha', 'Vikram', 'Anita', 'Rohan', 'Kavita', 'Sameer'];
  const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Desai', 'Iyer', 'Reddy'];
  return randomElement(firstNames) + ' ' + randomElement(lastNames);
}
function randomPhone() {
  // Indian mobile number format
  return '9' + String(100000000 + randomInt(0, 899999999)).padStart(9, '0');
}

// Supabase REST endpoint for orders
const ORDERS_ENDPOINT = `${SUPABASE_URL}/rest/v1/orders`;

// Places an order via Supabase REST API (simulates clicking "Order now")
async function placeOrder(userId, tableId) {
  const { lines, subtotal } = generateOrderLines();
  const taxPercent = 5; // Must match VITE_GST_PERCENT
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const total = subtotal + taxAmount;

  const payload = {
    table_label: String(tableId),
    lines: lines,
    note: `Order from simulated user ${userId}`,
    subtotal: subtotal,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    total: total,
    customer_name: randomCustomer(),
    customer_phone: randomPhone(),
  };

  try {
    const response = await axios.post(ORDERS_ENDPOINT, payload, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    console.log(`[User ${userId} | Table ${tableId}] ✅ Order placed: ${response.data.id}`);
    return true;
  } catch (error) {
    // If we get a 429 or 500, it's likely due to connection/rate limits
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    if (status === 429 || status >= 500) {
      console.warn(`[User ${userId} | Table ${tableId}] ⚠️  Rate/connection limit: ${status} ${message}`);
    } else {
      console.error(`[User ${userId} | Table ${tableId}] ❌ Order failed:`, message);
    }
    return false;
  }
}

// ===== GLOBAL COUNTERS (for the device report) =========================
let peakConcurrentConnections = 0;
let currentConnections = 0;
const deviceStats = new Map(); // userId -> { tableId, connected, ordersOk, ordersFailed }

function markConnected(userId) {
  currentConnections++;
  if (currentConnections > peakConcurrentConnections) peakConcurrentConnections = currentConnections;
  deviceStats.get(userId).connected = true;
}
function markDisconnected(userId) {
  currentConnections = Math.max(0, currentConnections - 1);
}

// ===== SIMULATED DEVICE CLASS ========================================
class SimulatedDevice {
  constructor(userId) {
    this.userId = userId;
    this.tableId = randomInt(1, 50); // Tables 1-50
    this.ws = null;
    this.isConnected = false;
    this.orderTimer = null;
    this.stopRequested = false;
    deviceStats.set(userId, { tableId: this.tableId, connected: false, ordersOk: 0, ordersFailed: 0 });
  }

  async connect() {
    try {
      // Use Supabase Realtime WebSocket endpoint
      const wsUrl = `${SUPABASE_URL}/realtime/v1/websocket?vsn=1.0.0&apikey=${encodeURIComponent(SUPABASE_KEY)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        markConnected(this.userId);
        console.log(`[User ${this.userId}] WS connected (table ${this.tableId})`);
        // Subscribe to the orders feed for this table (mimics real client)
        // Note: Supabase Realtime uses a protocol over WS; we send a JOIN message
        // for the postgres_changes endpoint we care about.
        // The topic format: broacast?event=postgres_changes&schema=public&table=orders&filter=table_label=eq.${this.tableId}
        // But we can also just listen to the broader orders-feed; the client will filter.
        // For simplicity, we'll join the general orders-feed (less precise but keeps conn alive).
        const joinMsg = {
          topic: 'realtime:orders-feed',
          event: 'phx_join',
          payload: {},
          ref: '1',
        };
        this.ws.send(JSON.stringify(joinMsg));
        // Also join availability and waiter feeds to be more realistic (optional)
        // This will increase channel count per connection but still one WS.
        // For connection counting, each WS is one connection regardless of number of channels.
        // So we keep it minimal to avoid unnecessary traffic.
      });

      this.ws.on('message', (data) => {
        // We don't need to process messages; just keeping the connection alive.
        // Uncomment for debugging:
        // console.debug(`[User ${this.userId}] WS msg:`, data.toString().slice(0, 100));
      });

      this.ws.on('close', () => {
        if (this.isConnected) markDisconnected(this.userId);
        this.isConnected = false;
        console.log(`[User ${this.userId}] WS closed`);
        if (this.orderTimer) {
          clearInterval(this.orderTimer);
          this.orderTimer = null;
        }
      });

      this.ws.on('error', (err) => {
        console.error(`[User ${this.userId}] WS error:`, err.message);
        this.isConnected = false;
      });

      // Wait for connection to establish (with timeout)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WS connection timeout')), 10000);
        this.ws.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        this.ws.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
        this.ws.once('close', () => {
          clearTimeout(timeout);
          reject(new Error('WS closed before open'));
        });
      });

      // Start placing orders at random intervals after a random initial delay
      const initialDelay = randomInt(5000, 30000); // 5-30s stagger
      setTimeout(() => {
        this.startOrdering();
      }, initialDelay);
    } catch (err) {
      console.error(`[User ${this.userId}] Failed to connect WS:`, err.message);
      this.isConnected = false;
      // deviceStats.connected stays false -> counted as failedConnectCount in final report
    }
  }

  startOrdering() {
    if (this.stopRequested) return;
    // Place first order immediately after initial delay (already delayed above)
    this.placeOrderLoop();
    // Set up recurring interval
    this.orderTimer = setInterval(() => {
      if (this.stopRequested) {
        clearInterval(this.orderTimer);
        this.orderTimer = null;
        return;
      }
      this.placeOrderLoop();
    }, randomInt(ORDER_INTERVAL_MIN_MS, ORDER_INTERVAL_MAX_MS));
  }

  placeOrderLoop() {
    if (!this.isConnected || this.stopRequested) return;
    placeOrder(this.userId, this.tableId)
      .then((ok) => {
        const stat = deviceStats.get(this.userId);
        if (ok) stat.ordersOk++; else stat.ordersFailed++;
      })
      .catch(() => {
        deviceStats.get(this.userId).ordersFailed++;
      });
  }

  async disconnect() {
    this.stopRequested = true;
    if (this.orderTimer) {
      clearInterval(this.orderTimer);
      this.orderTimer = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.isConnected = false;
  }
}

// ===== REPORT (shared by natural end and Ctrl+C) ========================
let testStartTimeGlobal = null;
let devicesGlobal = [];

function printReport(reason) {
  const endTime = Date.now();
  const durationSec = testStartTimeGlobal ? ((endTime - testStartTimeGlobal) / 1000).toFixed(1) : 'n/a';

  let connectedCount = 0, failedConnectCount = 0;
  let devicesWithSuccessfulOrder = 0, devicesWithAnyFailedOrder = 0;
  let totalOrdersOk = 0, totalOrdersFailed = 0;

  for (const [, s] of deviceStats) {
    if (s.connected) connectedCount++; else failedConnectCount++;
    if (s.ordersOk > 0) devicesWithSuccessfulOrder++;
    if (s.ordersFailed > 0) devicesWithAnyFailedOrder++;
    totalOrdersOk += s.ordersOk;
    totalOrdersFailed += s.ordersFailed;
  }

  console.log('='.repeat(60));
  console.log(`Test finished (${reason})`);
  console.log(`Elapsed: ${durationSec} seconds`);
  console.log(`Devices attempted: ${TOTAL_VIRTUAL_USERS}`);
  console.log(`Devices that connected (WS open): ${connectedCount}`);
  console.log(`Devices that FAILED to connect: ${failedConnectCount}`);
  console.log(`Peak concurrent WS connections: ${peakConcurrentConnections}`);
  console.log('-'.repeat(60));
  console.log(`Devices with >=1 successful order: ${devicesWithSuccessfulOrder}`);
  console.log(`Devices with >=1 failed order: ${devicesWithAnyFailedOrder}`);
  console.log(`Total orders succeeded: ${totalOrdersOk}`);
  console.log(`Total orders failed: ${totalOrdersFailed}`);
  console.log('-'.repeat(60));
  console.log(`==> Practical concurrent-device ceiling for this run: ${connectedCount} devices connected, ${devicesWithSuccessfulOrder} placed at least one order successfully.`);
  console.log('Check Supabase dashboard for peak concurrent connections during the test.');
  console.log('='.repeat(60));
}

// ===== TEST CONTROLLER ================================================
async function runLoadTest() {
  console.log('='.repeat(60));
  console.log('Realtime Connection Load Test for Tea Connect Mansion');
  console.log('='.repeat(60));
  console.log(`Target: ${TOTAL_VIRTUAL_USERS} simulated devices`);
  console.log(`Each device holds 1 WS connection + places orders every ${ORDER_INTERVAL_MIN_MS/1000}-${ORDER_INTERVAL_MAX_MS/1000}s`);
  console.log(`Test duration: ${TEST_DURATION_MS / 60000} minutes`);
  console.log(`Supabase free-tier connection limit: 60`);
  console.log('-'.repeat(60));
  console.log('👉  WATCH SUPABASE DASHBOARD NOW:');
  console.log('     Database → Connections (real-time graph)');
  console.log('     Look for the current concurrent connections count.');
  console.log('     When it approaches 60, you are at the limit.');
  console.log('     If it exceeds 60, you will see errors in this console.');
  console.log('-'.repeat(60));
  console.log('Starting in 5 seconds...\n');

  // Countdown
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('🚀 GO!\n');

  const startTime = Date.now();
  testStartTimeGlobal = startTime;
  const devices = [];
  devicesGlobal = devices;

  // Create and connect all devices
  for (let i = 1; i <= TOTAL_VIRTUAL_USERS; i++) {
    const device = new SimulatedDevice(i);
    devices.push(device);
    // Stagger connections slightly to avoid thundering herd on WS open
    setTimeout(() => device.connect(), i * 100); // 100ms stagger
    // Also throttle if we're creating too many too fast (optional)
    if (i % 20 === 0) {
      await new Promise(r => setTimeout(r, 500)); // pause every 20 devices
    }
  }

  // Wait for test duration
  await new Promise(r => setTimeout(r, TEST_DURATION_MS));

  // Test duration elapsed, disconnect all
  console.log('\n⏰ Test duration elapsed. Disconnecting all devices...');
  const disconnectPromises = devices.map(d => d.disconnect());
  await Promise.all(disconnectPromises);

  printReport('completed full duration');
}

// Handle graceful shutdown - print report even on early Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, disconnecting devices and printing report...');
  await Promise.all(devicesGlobal.map(d => d.disconnect()));
  printReport('interrupted early (Ctrl+C)');
  process.exit(0);
});

runLoadTest().catch((err) => {
  console.error('💥 Fatal error in load test:', err);
  process.exit(1);
});