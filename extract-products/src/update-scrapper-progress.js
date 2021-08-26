const ScrapperProgress = require("./models/scrapper-progress.js");
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
    initializeScrapperProgress: async (scrapperId) => {
        let scrapperProgress = new ScrapperProgress({
            startedAt: new Date(),
            status: 'started',
            productLinksToScrap: [],
            productScrappedLinks: [],
            catLinksToScrap: [],
            catScrappedLinks: [],
            scrapperId: scrapperId
        })
        await scrapperProgress.save();
        // await ScrapperProgress.updateOne({ scrapperId: scrapperId }, scrapperProgress, { upsert: true });
    },

    initializeCatLinksToScrap: async (scrapperId, categoryURLs) => {
        await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { catLinksToScrap: categoryURLs });
    },

    updateCatLinkProgress: async (scrapperId, categoryURLs) => {
        await ScrapperProgress.updateOne(
            { scrapperId: new ObjectId(scrapperId) },
            { $pull: { 'catLinksToScrap': categoryURLs }, $push: { 'catScrappedLinks': categoryURLs } }
        );
    },

    updateProductLinkToScrap: async (scrapperId, productURLs) => {
        console.log(productURLs.length, 'productURLsproductURLs')
        let scrapperProgress = await ScrapperProgress.findOne({ scrapperId: new ObjectId(scrapperId) });
        let productLinksToScrapClone = scrapperProgress.productLinksToScrap.slice(0);
        let productScrappedLinksClone = scrapperProgress.productScrappedLinks.slice(0);
        productURLs.map(async (url) => {
            if (productLinksToScrapClone.indexOf(url) < 0 && productScrappedLinksClone.indexOf(url) < 0) {
                await ScrapperProgress.updateOne(
                    { scrapperId: new ObjectId(scrapperId) },
                    { $push: { 'productLinksToScrap': url } }
                );
            }
        });
    },


    updateProductScrappedLinks: async (scrapperId, productURL) => {
        await ScrapperProgress.updateOne(
            { scrapperId: new ObjectId(scrapperId) },
            { $pull: { 'productLinksToScrap': productURL }, $push: { 'productScrappedLinks': productURL } }
        );
    }

}

