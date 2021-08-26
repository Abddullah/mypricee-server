const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ScrapperSchema = new Schema({
    started: { type: Boolean, default: false },

    storeInformation: { type: Object, required: true },
    categoryUrl: { type: Object, required: true },
    paginationQuery: { type: String, required: true },
    productUrl: { type: String, required: true },

    productTitle: { type: String, required: false },
    isProductTitle: { type: Boolean, required: true },

    productDescription: { type: String, required: false },
    isProductDescription: { type: Boolean, required: true },

    productCurrentPrice: { type: String, required: false },
    isProductCurrentPrice: { type: Boolean, required: true },

    productSlashedPrice: { type: String, required: false },
    isProductSlashedPrice: { type: Boolean, required: true },

    productRatting: { type: String, required: false },
    isProductRatting: { type: Boolean, required: true },

    productShipping: { type: String, required: false },
    isProductShipping: { type: Boolean, required: true },

    productCategory: { type: Object, required: false },
    productImage: { type: Object, required: false },


    // scrapperName: { type: String, required: true },
    // scrapperDescription: { type: String, required: true },

    // categoryUrl: { type: Object, required: true },
    // categoryLink: { type: Object, required: true },
    // productCategory: { type: String, required: true },
    // // brandLinkId: { type: Object, required: false },
    // productLink: { type: Object, required: true },
    // pagerQuery: { type: String, required: true },
    // productName: { type: Object, required: false },
    // productDescription: { type: Object, required: false },
    // productImage: { type: Object, required: false },
    // productCurrentPrice: { type: Object, required: false },
    // productSlashedPrice: { type: Object, required: false },
    // productRatting: { type: Object, required: false },
    // productShipping: { type: Object, required: false },
    shedule: { type: Date, required: false },
    delayInterval: { type: Number, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Scrapper", ScrapperSchema);