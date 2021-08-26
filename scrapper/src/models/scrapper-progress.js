const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ScrapperProgress = new Schema({
    startedAt: { type: Date },
    endAt: { type: Date },
    status: { type: String, required: false },
    catStatus: { type: String, required: false },
    paginationType: { type: String, required: false },
    productLinksToScrap: { type: Array, required: false },
    productScrappedLinks: { type: Array, required: false },
    catLinksToScrap: { type: Array, required: false },
    catScrappedLinks: { type: Array, required: false },
    scrapperId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("ScrapperProgress", ScrapperProgress);