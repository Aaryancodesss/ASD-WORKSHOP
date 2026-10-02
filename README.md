# Express Product API with Layered Architecture & Caching

An Express.js application designed with a layered architecture, in-memory caching with Time-To-Live (TTL), and automatic cache invalidation on data mutations.

---

## 🏗️ Architecture & Folder Structure

The application is structured into clearly separated layers:

```
projecttt/
├── routes/
│   └── productRoutes.js        # Defines routes and mounts middleware + controllers
├── controllers/
│   └── productController.js    # Handles HTTP requests, validation, and responses
├── services/
│   └── productService.js        # Implements business logic and data manipulation
├── database/
│   └── db.js                   # Handles file-based persistence for db.json
├── middleware/
│   └── cache.js                # Caching middleware with TTL and invalidation
├── db.json                     # JSON storage file
├── test/
│   └── verify.js               # Automated test suite
├── server.js                   # Express application entrypoint
└── package.json
```

### Request Flow
Every request follows the strict layered pipeline:

$$\text{Route} \longrightarrow \text{Middleware} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Database}$$

---

## ⚡ Caching Mechanism

### 1. In-Memory Store & Timestamping
- Each cached response is stored with its creation timestamp:
  ```javascript
  cacheStore.set(key, {
    data: responseBody,
    createdAt: Date.now()
  });
  ```
- Keys are mapped to request URLs (e.g., `/products`, `/products/1`).

### 2. Time-To-Live (TTL) of 1 Minute
- The TTL is configured to **60,000 ms (1 minute)**:
  ```javascript
  const TTL = 60 * 1000;
  ```
- When a cached endpoint is requested, the middleware calculates:
  ```javascript
  const isExpired = (Date.now() - cachedEntry.createdAt) > TTL;
  ```
- **If expired**: Stale data is discarded, latest data is fetched from the database through the controller and service, and the fresh value is stored in the cache.

### 3. Headers: Cache HIT and MISS
- **Cache HIT**: Sets header `X-Cache: HIT` and returns cached data directly without touching the controller, service, or database.
- **Cache MISS**: Sets header `X-Cache: MISS`, passes request to the controller, and stores fresh response in cache upon completion.

### 4. Cache Invalidation
- Handled by `invalidateCacheMiddleware`.
- Whenever a `POST`, `PUT`, `PATCH`, or `DELETE` request successfully modifies stored data (HTTP status $2xx$), all cache entries are invalidated:
  ```javascript
  clearCache();
  ```
- Subsequent `GET` requests will experience a cache `MISS` and fetch the updated data from the database.
- Failed requests (e.g., 400 Bad Request, 404 Not Found) do **not** invalidate the cache.

---

## 🚀 API Endpoints

| Method | Endpoint | Description | Cache Behavior |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Get all products | Cached (1-min TTL, `X-Cache: HIT/MISS`) |
| `GET` | `/products/:id` | Get product by ID | Cached (1-min TTL, `X-Cache: HIT/MISS`) |
| `POST` | `/products` | Create new product | Invalidates stale cache on 201 |
| `PUT` | `/products/:id` | Full update product | Invalidates stale cache on 200 |
| `PATCH` | `/products/:id` | Partial update product | Invalidates stale cache on 200 |
| `DELETE` | `/products/:id` | Delete product | Invalidates stale cache on 200 |

---

## 🧪 Running Locally & Testing

### Install Dependencies
```bash
npm install
```

### Start Server
```bash
# Start in development mode (with nodemon)
npm run dev

# Or start standard production server
npm start
```

### Run Verification Test Suite
```bash
npm test
```
The automated test suite verifies:
1. `GET /products` returns `X-Cache: MISS` on first request.
2. `GET /products` returns `X-Cache: HIT` on repeat request.
3. `GET /products/:id` returns `X-Cache: MISS` and `X-Cache: HIT`.
4. TTL expiration correctly discards expired data and fetches fresh data.
5. `POST /products` invalidates cache entries.
6. `PUT /products/:id` invalidates cache entries.
7. `PATCH /products/:id` invalidates cache entries.
8. `DELETE /products/:id` invalidates cache entries.
9. Failed mutations (e.g. 400 Bad Request) do not invalidate cache.
