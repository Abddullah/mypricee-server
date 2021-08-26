const path = require('path');
const envPath = require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

let DB_URI;
if (process.env.MONGO_DB_URI) {
  DB_URI = process.env.MONGO_DB_URI;
}

module.exports = {
  DB_URI
};