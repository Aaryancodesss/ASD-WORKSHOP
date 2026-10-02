const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../middleware/cache');

/**
 * Route layer for /products.
 * Request Flow: Route -> Middleware -> Controller -> Service -> Database
 */

// GET /products - Retrieve all products (cached with 1-min TTL, X-Cache header)
router.get('/', cacheMiddleware, productController.getAllProducts.bind(productController));

// GET /products/:id - Retrieve product by ID (cached with 1-min TTL, X-Cache header)
router.get('/:id', cacheMiddleware, productController.getProductById.bind(productController));

// POST /products - Create a new product (invalidates cache on success)
router.post('/', invalidateCacheMiddleware, productController.createProduct.bind(productController));

// PUT /products/:id - Fully update a product (invalidates cache on success)
router.put('/:id', invalidateCacheMiddleware, productController.updateProduct.bind(productController));

// PATCH /products/:id - Partially update a product (invalidates cache on success)
router.patch('/:id', invalidateCacheMiddleware, productController.patchProduct.bind(productController));

// DELETE /products/:id - Delete a product (invalidates cache on success)
router.delete('/:id', invalidateCacheMiddleware, productController.deleteProduct.bind(productController));

module.exports = router;
