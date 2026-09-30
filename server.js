const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');

// Helper function to read data from db.json
const readDb = () => {
  const fileData = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(fileData);
};

// Route to get all data
app.get('/', (req, res) => {
  try {
    const products = readDb();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error reading db.json', message: error.message });
  }
});

// Route to get all products
app.get('/products', (req, res) => {
  try {
    const products = readDb();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error reading db.json', message: error.message });
  }
});

// Route to get single product by ID
app.get('/products/:id', (req, res) => {
  try {
    const products = readDb();
    const product = products.find((p) => p.id === parseInt(req.params.id, 10));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error reading db.json', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  
  // Console me db.json ka data display karna:
  try {
    const products = readDb();
    console.log('db.json data read successfully:');
    console.log(products);
  } catch (err) {
    console.error('Failed to read db.json:', err.message);
  }
});
