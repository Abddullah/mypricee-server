const express = require("express");
const Scrapper = require("./models/scrapper-modal.js");
const ScrapperProgress = require("./models/scrapper-progress.js");
const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const axios = require('axios');
var cors = require('cors');
const ObjectId = require('mongoose').Types.ObjectId;
let browser;


app.use(cors())
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


/*  simple product page scrapper  */

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   const url = "https://www.daraz.pk/products/ronin-r-9-crystal-clear-sound-earphone-i124874337-s1282692864.html?spm=a2a0e.home.flashSale.3.35e34937JchLii&search=1&mp=1&c=fs";
//   await page.goto(url, { waitUntil: 'networkidle2' });

//   const title = await page.evaluate(() => document.querySelector('.pdp-mod-product-badge-title').textContent);
//   const price = await page.evaluate(() => document.querySelector('.pdp-price_size_xl').innerText);

//   console.log(title);
//   console.log(price);

//   await browser.close();
// })();

// feature

app.post("/api/v1/feature-scrapper/", async (req, res) => {
  await Scrapper.updateOne({ _id: new ObjectId(req.body.productId) }, { feature: req.body.isfeature });
  let productFound = await Scrapper.findOne({ _id: new ObjectId(req.body.productId) });
  console.log(productFound, 'productFound___productFound')
  res.json(productFound);

});

app.post("/api/v1/display-scrapper/", async (req, res) => {
  await Scrapper.updateOne({ _id: new ObjectId(req.body.productId) }, { display: req.body.isdisplay });
  let productFound = await Scrapper.findOne({ _id: new ObjectId(req.body.productId) });
  console.log(productFound, 'productFound___productFound')
  res.json(productFound);

});



/* Save New Scrapper */
app.post("/api/v1/add-duplicate-scrapper/", async (req, res) => {
  const { storeInformation, categoryUrl, paginationQuery, productUrl, productTitle, isProductTitle,
    isProductDescription, productDescription, productCurrentPrice, isProductCurrentPrice,
    isProductSlashedPrice, productSlashedPrice, isProductRatting, productRatting, productShipping,
    isProductShipping, productCategory, productImage, feature, display, allScrap, specificCategories, paginationType
  } = req.body;

  // console.log(storeInformation, categoryUrl, paginationQuery, productUrl, productTitle, isProductTitle,
  //   isProductDescription, productDescription, productCurrentPrice, isProductCurrentPrice,
  //   isProductSlashedPrice, productSlashedPrice, isProductRatting, productRatting, productShipping,
  //   isProductShipping, productCategory, productImage);

  // const imageData = storeInformation.imageUrl;
  // var imageBinary = Buffer.from(imageData.split(",")[1], "base64");
  // storeInformation.imageUrl = imageBinary;

  const scrapper = new Scrapper({
    storeInformation, categoryUrl, paginationQuery, productUrl, productTitle, isProductTitle,
    isProductDescription, productDescription, productCurrentPrice, isProductCurrentPrice,
    isProductSlashedPrice, productSlashedPrice, isProductRatting, productRatting, productShipping,
    isProductShipping, productCategory, productImage, feature, display, allScrap, specificCategories, paginationType
  });

  try {
    const savedScrapper = await scrapper.save();
    res.json(savedScrapper);
  }
  catch (err) {
    console.log(err, 'err');
    res.status(500).send(err);
  }

});


/* Save New Scrapper */
app.post("/api/v1/add-scrapper/", async (req, res) => {
  const { storeInformation, categoryUrl, paginationQuery, productUrl, productTitle, isProductTitle,
    isProductDescription, productDescription, productCurrentPrice, isProductCurrentPrice,
    isProductSlashedPrice, productSlashedPrice, isProductRatting, productRatting, productShipping,
    isProductShipping, productCategory, productImage , allScrap, specificCategories, paginationType
  } = req.body;

  console.log( allScrap, specificCategories, 'cccccccc____ccccccccc');

  const imageData = storeInformation.imageUrl;
  var imageBinary = Buffer.from(imageData.split(",")[1], "base64");
  storeInformation.imageUrl = imageBinary;

  const scrapper = new Scrapper({
    storeInformation, categoryUrl, paginationQuery, productUrl, productTitle, isProductTitle,
    isProductDescription, productDescription, productCurrentPrice, isProductCurrentPrice,
    isProductSlashedPrice, productSlashedPrice, isProductRatting, productRatting, productShipping,
    isProductShipping, productCategory, productImage, allScrap, specificCategories, paginationType
  });

  try {
    const savedScrapper = await scrapper.save();
    res.json(savedScrapper);
  }
  catch (err) {
    console.log(err, 'err');
    res.status(500).send(err);
  }
  let data = req.body;
  console.log(data, '/*/*')
  res.json({ msg: "working add scrapper api", data });

});



app.get("/api/v1/get-scrappers/", async (req, res) => {
  try {
    fetchedScrappers = await Scrapper.find({});
    res.json(fetchedScrappers);
  }
  catch (err) {
    res.status(500).send(err);
  }

});

app.get("/api/v1/get-scrappers-progress/", async (req, res) => {
  try {
    fetchedScrappers = await ScrapperProgress.find({});
    res.json(fetchedScrappers);
  }
  catch (err) {
    res.status(500).send(err);
  }

});

app.post("/api/v1/delete-scrappers/:id", async (req, res) => {
  try {
    let deletedScrapper = await Scrapper.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(deletedScrapper);
  }
  catch (err) {
    console.log(err, '----------------')
    res.status(500).send(err);
  }
});

app.post("/api/v1/edit-scrapper/", async (req, res) => {
  // const { scrapperName, scrapperDescription, categoryUrl, categoryLink, productLink, productName, productDescription,
  //   productImage, productCategory, productCurrentPrice, productSlashedPrice, productRatting, productShipping, pagerQuery
  // } = req.body;
  // console.log(req.body);

  let updatedScrapper = req.body;
  const imageData = updatedScrapper.storeInformation.imageUrl;
  var imageBinary = Buffer.from(imageData.split(",")[1], "base64");
  updatedScrapper.storeInformation.imageUrl = imageBinary;

  await Scrapper.updateOne({ _id: new ObjectId(req.body._id) }, updatedScrapper);
  let scrapperFound = await Scrapper.findOne({ _id: new ObjectId(req.body._id) });

  res.json(scrapperFound);
});

app.post("/api/v1/run-scrapper/:id", async (req, res) => {
  // console.log(req.body, req.params);
  // let sheduledInformation = {
  //   shedule: req.body.scrapperShedule,
  //   delayInterval: req.body.delayInterval
  // }
  // let scrapperSheduled = await Scrapper.updateOne({ _id: new ObjectId(req.params.id) }, sheduledInformation);
  // console.log('information updated ', scrapperSheduled);
  await axios.get(`http://localhost:7000/api/v1/test-scrapper/${req.params.id}`);
  res.end()
  // res.json(scrapperSheduled);
  // let fetchedScrapper, categoryLinks;
  // browser = await puppeteer.launch({ headless: false });

  // try {
  //   fetchedScrapper = await Scrapper.findOne({ _id: new ObjectId(req.params.id) });
  //   categoryLinks = await makeCategoriesLink(fetchedScrapper.url, fetchedScrapper.categoryLinkId);
  //   categoryLinks = JSON.parse(categoryLinks);
  //   console.log(categoryLinks, 'categoryLinks');

  //   let productLinks = await makeProductsLink(categoryLinks, fetchedScrapper);
  //   console.log(JSON.parse(productLinks), 'categoryLinks')

  //   res.json(fetchedScrapper);
  // }
  // catch (err) {
  //   res.status(500).send(err);
  // }



})


async function makeCategoriesLink(url, categoryLinkId) {
  return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();
    const classQuery = `.${categoryLinkId}`;

    await page.goto(url, { waitUntil: 'networkidle2' });

    const categoryLinks = await page.evaluateHandle((classQuery) => {
      let elementAchor = [...document.querySelectorAll(classQuery + " a")]
      let links = elementAchor.map(a => a.href);
      return JSON.stringify(links);
    }, classQuery);
    // await browser.close();

    resolve(categoryLinks._remoteObject.value)
  })
}


async function makeProductsLink(categoryLinks, fetchedScrapper) {
  return new Promise(async (resolve, reject) => {




  });
}




module.exports = app;