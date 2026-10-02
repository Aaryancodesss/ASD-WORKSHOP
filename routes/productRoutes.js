const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../middleware/cache');

router.get('/', cacheMiddleware, productController.getAllProducts.bind(productController));
router.get('/:id', cacheMiddleware, productController.getProductById.bind(productController));
router.post('/', invalidateCacheMiddleware, productController.createProduct.bind(productController));
router.put('/:id', invalidateCacheMiddleware, productController.updateProduct.bind(productController));
router.patch('/:id', invalidateCacheMiddleware, productController.patchProduct.bind(productController));
router.delete('/:id', invalidateCacheMiddleware, productController.deleteProduct.bind(productController));

module.exports = router;
