const productService = require('../services/productService');

/**
 * Controller handling HTTP requests and delegating to ProductService.
 */
class ProductController {
  /**
   * GET /products
   * Retrieve all products.
   */
  getAllProducts(req, res) {
    try {
      const products = productService.getAllProducts();
      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json({ error: 'Error reading database', message: error.message });
    }
  }

  /**
   * GET /products/:id
   * Retrieve single product by ID.
   */
  getProductById(req, res) {
    try {
      const product = productService.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({ error: 'Error reading database', message: error.message });
    }
  }

  /**
   * POST /products
   * Create a new product.
   */
  createProduct(req, res) {
    try {
      const { name, price } = req.body;
      if (!name || price === undefined || isNaN(Number(price))) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'Product name and valid numeric price are required' 
        });
      }

      const createdProduct = productService.createProduct({ name, price: Number(price) });
      return res.status(201).json(createdProduct);
    } catch (error) {
      return res.status(500).json({ error: 'Error creating product', message: error.message });
    }
  }

  /**
   * PUT /products/:id
   * Fully update an existing product.
   */
  updateProduct(req, res) {
    try {
      const { name, price } = req.body;
      if (!name || price === undefined || isNaN(Number(price))) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'Product name and valid numeric price are required for update' 
        });
      }

      const updatedProduct = productService.updateProduct(req.params.id, { name, price: Number(price) });
      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(updatedProduct);
    } catch (error) {
      return res.status(500).json({ error: 'Error updating product', message: error.message });
    }
  }

  /**
   * PATCH /products/:id
   * Partially update an existing product.
   */
  patchProduct(req, res) {
    try {
      const { name, price } = req.body;
      if (name === undefined && price === undefined) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'At least one field (name or price) is required to patch' 
        });
      }

      if (price !== undefined && isNaN(Number(price))) {
        return res.status(400).json({ 
          error: 'Validation Error', 
          message: 'Price must be a valid number' 
        });
      }

      const patchedProduct = productService.patchProduct(req.params.id, req.body);
      if (!patchedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(patchedProduct);
    } catch (error) {
      return res.status(500).json({ error: 'Error patching product', message: error.message });
    }
  }

  /**
   * DELETE /products/:id
   * Delete a product by ID.
   */
  deleteProduct(req, res) {
    try {
      const deletedProduct = productService.deleteProduct(req.params.id);
      if (!deletedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ 
        message: 'Product deleted successfully', 
        product: deletedProduct 
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error deleting product', message: error.message });
    }
  }
}

module.exports = new ProductController();
