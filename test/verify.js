const http = require('http');
const app = require('../server');
const { setTTL, clearCache, TTL } = require('../middleware/cache');
const fs = require('fs');
const { dbPath } = require('../database/db');

const originalRawDb = fs.readFileSync(dbPath, 'utf8');

const runTests = async () => {
  console.log('--- Starting Verification Test Suite ---');
  
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

    console.log('\n1. Testing GET /products Cache MISS:');
    let res = await fetch(`${baseUrl}/products`);
    let data = await res.json();
    assert(res.status === 200, 'Status is 200');
    assert(res.headers.get('x-cache') === 'MISS', 'Header X-Cache is MISS');
    assert(Array.isArray(data) && data.length > 0, 'Returns array of products');

    console.log('\n2. Testing GET /products Cache HIT:');
    res = await fetch(`${baseUrl}/products`);
    data = await res.json();
    assert(res.status === 200, 'Status is 200');
    assert(res.headers.get('x-cache') === 'HIT', 'Header X-Cache is HIT on subsequent request');

    console.log('\n3. Testing GET /products/1 Cache MISS and HIT:');
    res = await fetch(`${baseUrl}/products/1`);
    data = await res.json();
    assert(res.status === 200, 'Status is 200');
    assert(res.headers.get('x-cache') === 'MISS', 'Header X-Cache is MISS for /products/1');
    assert(data.id === 1, 'Returns product with ID 1');

    res = await fetch(`${baseUrl}/products/1`);
    assert(res.headers.get('x-cache') === 'HIT', 'Header X-Cache is HIT for /products/1 on repeat');

    console.log('\n4. Testing Cache TTL Expiration:');
    setTTL(100);
    await fetch(`${baseUrl}/products`);
    await new Promise((resolve) => setTimeout(resolve, 150));
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'MISS', 'Header X-Cache is MISS after TTL expiration');
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Header X-Cache is HIT again after refreshing cache');
    setTTL(TTL);

    console.log('\n5. Testing Cache Invalidation on POST /products:');
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products is HIT');

    const newProductPayload = { name: 'Wireless Headphones', price: 99.99 };
    const postRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductPayload),
    });
    const createdProduct = await postRes.json();
    assert(postRes.status === 201, 'POST /products returns 201 Created');
    assert(createdProduct.name === 'Wireless Headphones', 'Created product has correct name');

    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products is MISS after POST invalidation');
    data = await res.json();
    assert(data.some((p) => p.name === 'Wireless Headphones'), 'Fresh data contains new product');

    console.log('\n6. Testing Cache Invalidation on PUT /products/:id:');
    await fetch(`${baseUrl}/products/${createdProduct.id}`);
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products/:id is HIT');

    const putRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pro Wireless Headphones', price: 129.99 }),
    });
    assert(putRes.status === 200, 'PUT /products/:id returns 200');

    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products/:id is MISS after PUT invalidation');
    const updated = await res.json();
    assert(updated.price === 129.99, 'Updated product has new price');

    console.log('\n7. Testing Cache Invalidation on PATCH /products/:id:');
    await fetch(`${baseUrl}/products/${createdProduct.id}`);
    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products/:id is HIT');

    const patchRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 109.99 }),
    });
    assert(patchRes.status === 200, 'PATCH /products/:id returns 200');

    res = await fetch(`${baseUrl}/products/${createdProduct.id}`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products/:id is MISS after PATCH invalidation');
    const patched = await res.json();
    assert(patched.price === 109.99, 'Patched product has new price');

    console.log('\n8. Testing Cache Invalidation on DELETE /products/:id:');
    await fetch(`${baseUrl}/products`);
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products is HIT');

    const delRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, {
      method: 'DELETE',
    });
    assert(delRes.status === 200, 'DELETE /products/:id returns 200');

    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'MISS', 'GET /products is MISS after DELETE invalidation');
    data = await res.json();
    assert(!data.some((p) => p.id === createdProduct.id), 'Deleted product is no longer present');

    console.log('\n9. Testing failed mutation does NOT invalidate cache:');
    await fetch(`${baseUrl}/products`);
    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Prerequisite: GET /products is HIT');

    const failedPost = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'field' }),
    });
    assert(failedPost.status === 400, 'Failed POST returns 400 Bad Request');

    res = await fetch(`${baseUrl}/products`);
    assert(res.headers.get('x-cache') === 'HIT', 'Cache remains HIT after failed POST');

    console.log(`\n--- Verification Summary: ${passed} of ${total} tests passed ---`);
  } finally {
    fs.writeFileSync(dbPath, originalRawDb, 'utf8');
    server.close();
  }
};

runTests();
