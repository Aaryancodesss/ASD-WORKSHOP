const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');

/**
 * Reads all records from the db.json file.
 * @returns {Array<Object>} List of records
 */
const readDb = () => {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const fileData = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    throw new Error(`Database read error: ${error.message}`);
  }
};

/**
 * Writes records to the db.json file.
 * @param {Array<Object>} data - Data to persist
 */
const writeDb = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    throw new Error(`Database write error: ${error.message}`);
  }
};

module.exports = {
  readDb,
  writeDb,
  dbPath,
};
