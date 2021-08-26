const express = require("express");
const Scrapper = require("./models/scrapper-modal.js.js.js");
const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const axios = require('axios');
const ObjectId = require('mongoose').Types.ObjectId;
let browser;

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


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




/* Save New Scrapper */
app.post("/api/v1/add-scrapper/", async (req, res) => {
  const { scrapperName, scrapperDescription, categoryUrl, categoryLink, productLink, productName, productDescription,
    productImage, productCategory, productCurrentPrice, productSlashedPrice, productRatting, productShipping, pagerQuery
  } = req.body;

  console.log(scrapperName, scrapperDescription, categoryUrl, categoryLink, productLink, productName, productDescription,
    productImage, productCategory, productCurrentPrice, productSlashedPrice, productRatting, productShipping, pagerQuery);
  const scrapper = new Scrapper({
    scrapperName,
    scrapperDescription,
    categoryUrl,
    categoryLink,
    // brandLinkId,
    productCategory,
    pagerQuery,
    productLink,
    productName,
    productDescription,
    productImage,
    productCurrentPrice,
    productSlashedPrice,
    productRatting,
    productShipping
  });

  try {
    const savedScrapper = await scrapper.save();
    res.json(savedScrapper);
  }
  catch (err) {
    res.status(500).send(err);
  }
  // let data = req.body;
  // console.log(data, '/*/*')
  // res.json({ msg: "working add scrapper api", data });

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
  await Scrapper.updateOne({ _id: new ObjectId(req.body._id) }, req.body);
  let scrapperFound = await Scrapper.findOne({ _id: new ObjectId(req.body._id) });

  res.json(scrapperFound);
});

app.post("/api/v1/run-scrapper/:id", async (req, res) => {
  console.log(req.body, req.params);
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