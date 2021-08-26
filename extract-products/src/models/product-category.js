const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const ProductCategorySchema = new Schema({
    storeUrl: { type: String, required: false },
    categoryName: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ProductCategory", ProductCategorySchema);