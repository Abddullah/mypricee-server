const path = require('path');
// const envPath = require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// let DB_URI;
// if (process.env.MONGO_DB_URI) {
//   DB_URI = process.env.MONGO_DB_URI;
// }

DB_URI = 'mongodb+srv://headeralishah:NpanOw6eSoCnsi8Z@cluster0.lrmmd.gcp.mongodb.net/mypricee-dev?retryWrites=true&w=majority'

module.exports = {
  DB_URI
};