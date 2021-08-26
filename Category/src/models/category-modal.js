const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const customCategory = new Schema({

    subcategories: { type: Array, required: true },
    categoryName: { type: String, required: true }

});

module.exports = mongoose.model("custom-category", customCategory);