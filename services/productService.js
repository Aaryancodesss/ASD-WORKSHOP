const db = require('../database/db');

class ProductService {
  getAllProducts() {
    return db.readDb();
  }

  getProductById(id) {
    const numericId = parseInt(id, 10);
    const products = db.readDb();
    const product = products.find((p) => p.id === numericId);
    return product || null;
  }

  createProduct(productData) {
    const products = db.readDb();
    
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
      id: numericId,
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
