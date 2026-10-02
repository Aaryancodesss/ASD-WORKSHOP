const express = require('express');
const productRoutes = require('./routes/productRoutes');
const { cacheMiddleware } = require('./middleware/cache');
const productController = require('./controllers/productController');
const { readDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/products', productRoutes);

app.get('/', cacheMiddleware, productController.getAllProducts.bind(productController));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);

    try {
      const products = readDb();
      console.log('db.json data read successfully:');
      console.log(products);
    } catch (err) {
      console.error('Failed to read db.json:', err.message);
    }
  });
}

module.exports = app;
