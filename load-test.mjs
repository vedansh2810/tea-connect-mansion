// Load test for Tea Connect Mansion - Order placement only
// ------------------------------------------------------
// This script tests the order placement API endpoint
// by making concurrent requests to place mock orders

import axios from 'axios';

// Supabase configuration from .env.local
const SUPABASE_URL = 'https://irgtlnenopfcuuawfhhe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZ3RsbmVub3BmY3V1YXdmaGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NzQ0MTQsImV4cCI6MjEwMjQ1MDQxNH0.Z6g9ucXsHI5k8mNc_FZASmyOFRtECKB5YuuDFe6IvUk';

// REST API endpoint for orders
const ORDERS_ENDPOINT = `${SUPABASE_URL}/rest/v1/orders`;

/**
 * Place a mock order via Supabase REST API
 */
async function placeOrder(table, lines, subtotal, customerName = 'Test', customerPhone = '1234567890') {
  try {
    const payload = {
      table_label: String(table),
      lines: Array.isArray(lines) ? lines : [],
      note: `Test order from load test`,
      subtotal: subtotal,
      tax_percent: 5, // Match VITE_GST_PERCENT
      tax_amount: Math.round(subtotal * 0.05),
      total: subtotal + Math.round(subtotal * 0.05),
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
    };

    const response = await axios.post(ORDERS_ENDPOINT, payload, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Order placed for table ${table}: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error(`❌ Failed to place order for table ${table}:`, error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runLoadTest() {
  const startTime = Date.now();
  const CONCURRENT_USERS = 50;
  
  console.log('=== Starting load test for order placement ===');
  console.log(`Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`Testing order placement via Supabase REST API...`);
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('\\nStarting test in 3 seconds...\n');
  
  // Give time to monitor Supabase dashboard
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const ordersPlaced = [];
  const errors = [];
  const start = Date.now();

  // Launch concurrent requests
  const promises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    const table = Math.floor(Math.random() * (60 - 1 + 1)) + 1; // Tables 1-60
    const lines = [
      { name: 'Chai', qty: 2, unitPrice: 30 },
      { name: 'Tea', qty: 1, unitPrice: 25 }
    ];
    const subtotal = 85; // 60 + 25
    
    promises.push(placeOrder(table, lines, subtotal));
  }
  
  // Wait for all requests to complete
  const results = await Promise.allSettled(promises);
  
  // Process results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value !== null) {
      ordersPlaced.push(result.value);
    } else {
      const error = result.status === 'rejected' ? result.reason : 'Order placement failed';
      errors.push(`User ${index}: ${error.message || error}`);
    }
  });

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000; // seconds

  console.log(`\\n=== TEST RESULTS ===`);
  console.log(`Total test time: ${duration.toFixed(1)} seconds`);
  console.log(`Total orders placed: ${ordersPlaced.length}/${CONCURRENT_USERS}`);
  console.log(`Successful placements: ${ordersPlaced.length}`);
  console.log(`Failed placements: ${errors.length}`);
  
  // Calculate rate
  const rate = ordersPlaced.length / duration;
  console.log(`Orders per second: ${rate.toFixed(2)}`);
  
  if (errors.length > 0 && errors.length <= 5) {
    console.log('\\nErrors encountered:');
    errors.forEach(err => console.log(`  - ${err}`));
  } else if (errors.length > 5) {
    console.log(`\\nFirst 5 errors:`);
    errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
  }
  
  console.log(`\\n=== NEXT STEPS ===`);
  console.log('1. Check your Supabase Dashboard now:');
  console.log('   - Look at "Database Connections" metric');
  console.log('   - Peak connections during test show load impact');
  console.log('   - Watch for any "RLS errors" or timeouts');
  console.log('2. The free tier limit is 60 concurrent connections');
  console.log('3. Each order placement consumes a database connection');
  console.log('4. Realtime connections would add to this count in real usage');
}

// Run the test
runLoadTest().catch(error => {
  console.error('Fatal error in load test:', error.message);
  process.exit(1);
});