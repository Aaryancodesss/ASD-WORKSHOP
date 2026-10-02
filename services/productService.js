const db = require('../database/db');

/**
 * Service handling product business logic and persistence.
 */
class ProductService {
  /**
   * Fetch all products from database.
   * @returns {Array<Object>}
   */
  getAllProducts() {
    return db.readDb();
  }

  /**
   * Find product by ID.
   * @param {number|string} id 
   * @returns {Object|null}
   */
  getProductById(id) {
    const numericId = parseInt(id, 10);
    const products = db.readDb();
    const product = products.find((p) => p.id === numericId);
    return product || null;
  }

  /**
   * Create a new product.
   * @param {Object} productData 
   * @returns {Object} Created product
   */
  createProduct(productData) {
    const products = db.readDb();
    
    // Auto-increment ID based on highest existing ID
    const nextId = products.length > 0 
      ? Math.max(...products.map((p) => (typeof p.id === 'number' ? p.id : parseInt(p.id, 10) || 0))) + 1 
      : 1;

    const newProduct = {
      id: nextId,
      name: productData.name,
      price: typeof productData.price === 'number' ? productData.price : parseFloat(productData.price),
    };

    products.push(newProduct);
    db.writeDb(products);
    return newProduct;
  }

  /**
   * Fully update a product by ID (PUT).
   * @param {number|string} id 
   * @param {Object} productData 
   * @returns {Object|null} Updated product or null if not found
   */
  updateProduct(id, productData) {
    const numericId = parseInt(id, 10);
    const products = db.readDb();
    const index = products.findIndex((p) => p.id === numericId);

    if (index === -1) {
      return null;
    }

    const updatedProduct = {
      id: numericId,
      name: productData.name,
      price: typeof productData.price === 'number' ? productData.price : parseFloat(productData.price),
    };

    products[index] = updatedProduct;
    db.writeDb(products);
    return updatedProduct;
  }

  /**
   * Partially update a product by ID (PATCH).
   * @param {number|string} id 
   * @param {Object} partialData 
   * @returns {Object|null} Updated product or null if not found
   */
  patchProduct(id, partialData) {
    const numericId = parseInt(id, 10);
    const products = db.readDb();
    const index = products.findIndex((p) => p.id === numericId);

    if (index === -1) {
      return null;
    }

    const currentProduct = products[index];
    const patchedProduct = {
      ...currentProduct,
      ...partialData,
      id: numericId, // Ensure ID cannot be changed
    };

    if (partialData.price !== undefined) {
      patchedProduct.price = typeof partialData.price === 'number' 
        ? partialData.price 
        : parseFloat(partialData.price);
    }

    products[index] = patchedProduct;
    db.writeDb(products);
    return patchedProduct;
  }

  /**
   * Delete a product by ID.
   * @param {number|string} id 
   * @returns {Object|null} Deleted product or null if not found
   */
  deleteProduct(id) {
    const numericId = parseInt(id, 10);
    const products = db.readDb();
    const index = products.findIndex((p) => p.id === numericId);

    if (index === -1) {
      return null;
    }

    const [deletedProduct] = products.splice(index, 1);
    db.writeDb(products);
    return deletedProduct;
  }
}

module.exports = new ProductService();
