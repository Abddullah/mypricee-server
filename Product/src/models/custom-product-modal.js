const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ScrapperSchema = new Schema({

    productName: { type: String, required: true },
    sroreUrl: { type: String, required: true },
    visitorCount: { type: String, required: true },
    punchTracking: { type: String, required: true },
    slashPrice: { type: String, required: true },
    currentPrice: { type: String, required: true },
    Rating: { type: String, required: true },
    shipping: { type: String, required: true },
    productFeatures: { type: String, required: true },
    discription: { type: String, required: true },
    productImages: { type: Object, required: true },

});

module.exports = mongoose.model("custom-product", ScrapperSchema);