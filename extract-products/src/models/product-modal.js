const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const ProductSchema = new Schema({
    storeUrl: { type: String, required: false },
    categoryDetails: { type: String, required: false },
    productLink: { type: String, required: false, unique: true },
    productTitle: { type: String, required: false },
    productDescription: { type: String, required: false },
    productCategory: { type: Array, required: false },
    productImages: { type: Array, required: false },
    productCurrentPrice: { type: String, required: false },
    priceHistory: { type: Array, required: false },
    productSlashedPrice: { type: String, required: false },
    productRatting: { type: String, required: false },
    productShipping: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    lastUpdate: { type: Date, required: false },
});

module.exports = mongoose.model("Product", ProductSchema);