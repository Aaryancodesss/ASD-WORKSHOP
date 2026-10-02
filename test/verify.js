const http = require('http');
const app = require('../server');
const { setTTL, clearCache, TTL } = require('../middleware/cache');
const { readDb, writeDb } = require('../database/db');

// Backup db.json data before tests
const originalDbData = readDb();

const runTests = async () => {
  console.log('--- Starting Verification Test Suite ---');
  
  // Start server on an ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let total = 0;

  const assert = (condition, message) => {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      process.exitCode = 1;
    }
  };

  try {
    clearCache();

    // 1. GET /products -> Cache MISS
    console.log('\n1. Testing GET /products Cache MISS:');
    let res = await fetch(`${baseUrl}/products`);
    let data = await res.json();
    assert(res.status === 200, 'Status is 200');
    assert(res.headers.get('x-cache') === 'MISS', 'Header X-Cache is MISS');
    assert(Array.isArray(data) && data.length > 0, 'Returns array of products');

    // 2. GET /products -> Cache HIT
    console.log('\n2. Testing GET /products Cache HIT:');
    res = await fetch(`${baseUrl}/products`);
    data = await res.json();
    assert(res.status === 200, 'Status is 200');
    assert(res.headers.get('x-cache') === 'HIT', 'Header X-Cache is HIT on subsequent request');

    // 3. GET /products/:id -> Cache MISS & HIT
    console.log('\n3. Testing GET /products/1 Cache MISS and HIT:');
    res = await fetch(`${baseUrl}/products/1`);
    data = await res.json();
    assert(res.status === 200, 'Status is 200');
    assert(res.headers.get('x-cache') === 'MISS', 'Header X-Cache is MISS for /products/1');
    assert(data.id === 1, 'Returns product with ID 1');

    res = await fetch(`${baseUrl}/products/1`);
    assert(res.headers.get('x-cache') === 'HIT', 'Header X-Cache is HIT for /products/1 on repeat');

    // 4. Testing TTL Expiration
    console.log('\n4. Testing Cache TTL Expiration:');
    // Temporarily set TTL to 100ms to test expiration
    setTTL(100);
    // Populate cache
    await fetch(`${baseUrl}/products`);
    // Wait for 150ms (> 100ms TTL)
    await new Promise((resolve) => setTimeout(resolve, 150));
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'MISS', 'Header X-Cache is MISS after TTL expiration');
    // Immediately subsequent request is HIT
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Header X-Cache is HIT again after refreshing cache');
    // Restore default 1-minute TTL
    setTTL(TTL);

    // 5. Testing Cache Invalidation on POST /products
    console.log('\n5. Testing Cache Invalidation on POST /products:');
    // Cache is currently HIT for /products
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products is HIT');

    // Add new product
    const newProductPayload = { name: 'Wireless Headphones', price: 99.99 };
    const postRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductPayload),
    });
    const createdProduct = await postRes.json();
    assert(postRes.status === 201, 'POST /products returns 201 Created');
    assert(createdProduct.name === 'Wireless Headphones', 'Created product has correct name');

    // GET /products should now be MISS because cache was invalidated
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products is MISS after POST invalidation');
    data = await res.json();
    assert(data.some((p) => p.name === 'Wireless Headphones'), 'Fresh data contains new product');

    // 6. Testing Cache Invalidation on PUT /products/:id
    console.log('\n6. Testing Cache Invalidation on PUT /products/:id:');
    // Populate cache for the created product
    await fetch(`${baseUrl}/products/${createdProduct.id}`);
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products/:id is HIT');

    // Perform PUT update
    const putRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pro Wireless Headphones', price: 129.99 }),
    });
    assert(putRes.status === 200, 'PUT /products/:id returns 200');

    // Next GET should be MISS due to invalidation
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products/:id is MISS after PUT invalidation');
    const updated = await res.json();
    assert(updated.price === 129.99, 'Updated product has new price');

    // 7. Testing Cache Invalidation on PATCH /products/:id
    console.log('\n7. Testing Cache Invalidation on PATCH /products/:id:');
    // Populate cache
    await fetch(`${baseUrl}/products/${createdProduct.id}`);
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products/:id is HIT');

    // Perform PATCH update
    const patchRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 109.99 }),
    });
    assert(patchRes.status === 200, 'PATCH /products/:id returns 200');

    // Next GET should be MISS due to invalidation
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products/:id is MISS after PATCH invalidation');
    const patched = await res.json();
    assert(patched.price === 109.99, 'Patched product has new price');

    // 8. Testing Cache Invalidation on DELETE /products/:id
    console.log('\n8. Testing Cache Invalidation on DELETE /products/:id:');
    // Populate cache for /products
    await fetch(`${baseUrl}/products`);
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products is HIT');

    // Perform DELETE
    const delRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'DELETE',
    });
    assert(delRes.status === 200, 'DELETE /products/:id returns 200');

    // Next GET should be MISS due to invalidation
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products is MISS after DELETE invalidation');
    data = await res.json();
    assert(!data.some((p) => p.id === createdProduct.id), 'Deleted product is no longer present');

    // 9. Testing failed mutation does NOT invalidate cache
    console.log('\n9. Testing failed mutation does NOT invalidate cache:');
    // Ensure cache is HIT
    await fetch(`${baseUrl}/products`);
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products is HIT');

    // Attempt invalid POST
    const failedPost = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'field' }),
    });
    assert(failedPost.status === 400, 'Failed POST returns 400 Bad Request');

    // Cache should STILL be HIT
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Cache remains HIT after failed POST');

    console.log(`\n--- Verification Summary: ${passed} of ${total} tests passed ---`);
  } finally {
    // Restore original db.json content
    writeDb(originalDbData);
    server.close();
  }
};

runTests();
