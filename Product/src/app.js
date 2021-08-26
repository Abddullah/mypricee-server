const express = require("express");
const CustomProduct = require("./models/custom-product-modal");
const Product = require("./models/product-modal");

const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const axios = require('axios');
var cors = require('cors');
const ObjectId = require('mongoose').Types.ObjectId;

let browser;

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


app.post("/api/v1/product-feature/", async (req, res) => {
  await Product.updateOne({ _id: new ObjectId(req.body.productId) }, { feature: req.body.isfeature });


  let productFound = await Product.findOne({ _id: new ObjectId(req.body.productId) });
  console.log(productFound, 'productFound___productFound')
  res.json(productFound);
});

app.post("/api/v1/product-display/", async (req, res) => {
  await Product.updateOne({ _id: new ObjectId(req.body.productId) }, { display: req.body.isdisplay });


  let productFound = await Product.findOne({ _id: new ObjectId(req.body.productId) });
  console.log(productFound, 'productFound___productFound')
  res.json(productFound);
});

app.post("/api/v1/product-deal/", async (req, res) => {
  await Product.updateOne({ _id: new ObjectId(req.body.productId) }, { deal: req.body.isdeal });


  let productFound = await Product.findOne({ _id: new ObjectId(req.body.productId) });
  console.log(productFound, 'productFound___productFound')
  res.json(productFound);
});




// app.get("/api/v1/get-feature/", async (req, res) => {
//   console.log('eessssssssssssssssssssseee')
//   try {
//     fetchedFeature = await Feature.find({});
//     res.json(fetchedFeature);
//   }
//   catch (err) {
//     console.log(err,'eee')
//     res.status(500).send(err);
//   }
// });




app.post("/api/v1/add-product/", async (req, res) => {
  let imgsArr = []
  const {
    productTitle,
    productLink,
    productSlashedPrice,
    productCurrentPrice,
    productRatting,
    productShipping,
    productDescription,
    productImages,
    customProducts,
    deal,
    feature,
    display,
  } = req.body;

  productImages.map((img, i) => {
    if (img.thumbUrl) {
      const imageData = img.thumbUrl;
      var imageBinary = Buffer.from(imageData.split(",")[1], "base64");
      imgsArr.push(imageBinary)
    }
    else {
      imgsArr.push(img)
    }
    if (productImages.length === i + 1) {
      saveData()
    }
  })

  function saveData() {
    const product = new Product({
      productTitle,
      productLink,
      productSlashedPrice,
      productCurrentPrice,
      productRatting,
      productShipping,
      productDescription,
      productImages: imgsArr,
      customProducts,
      deal,
      feature,
      display,
    });
    try {
      const savedScrapper = product.save();
      res.json(savedScrapper);
    }
    catch (err) {
      res.status(500).send(err);
    }
  }
});

app.post("/api/v1/get-products/:pageNumber/:numberOfPages", async (req, res) => {
  const resultsPerPage = req.params.numberOfPages * 5;
  const pageNumber = req.params.pageNumber >= 1 ? req.params.pageNumber - 1 : 0;
  const pagesToSkip = (resultsPerPage / 5) * pageNumber;
  const filter = req.body.filter
  const searching = filter.selectedKeyWord

  const query = {}
  if (filter && filter.selectedStore && filter.selectedStore != 'all') {
    query.storeUrl = filter.selectedStore
  }

  // if (filter && filter.selectedKeyWord && filter.selectedKeyWord != '') {
  //   query = { productTitle: new RegExp(filter.selectedKeyWord, 'i') }
  //   console.log('SEARCH____SEARCH', query)
  // }

  try {
    fetchedProducts = await Product.find(searching ? { productTitle: new RegExp(searching, 'i') } : query)
      .limit(resultsPerPage)
      .skip(pagesToSkip);

    res.json(fetchedProducts);
  }
  catch (err) {
    console.log(err, 'eee')
    res.status(500).send(err);
  }
});




app.get("/api/v1/get-scrap-product-store", async (req, res) => {
  console.log('call_API')
  Product.distinct("storeUrl", function (error, results) {
    try {

      console.log(results, 'results___results');
      res.json(results)
    }
    catch {
      console.log(error, 'error___error');
      res.json(error)

    }
  });
  // const resultsPerPage = req.params.numberOfPages * 5;
  // const pageNumber = req.params.pageNumber >= 1 ? req.params.pageNumber - 1 : 0;
  // const pagesToSkip = (resultsPerPage / 5) * pageNumber;
  // console.log('eeeee pageNumber', resultsPerPage, pagesToSkip)
  // try {
  //   fetchedProducts = await Product.find({})
  //     .limit(resultsPerPage)
  //     .skip(pagesToSkip);
  //   console.log(fetchedProducts.length, 'fetchedProducts');
  //   res.json(fetchedProducts);
  // }
  // catch (err) {
  //   console.log(err, 'eee')
  //   res.status(500).send(err);
  // }
});

app.post("/api/v1/delete-product/:id", async (req, res) => {
  // http://localhost:9000/api/v1/delete-product/5f5755ce9058f62c5478ceeavvv
  console.log('request received', req.params.id)
  try {
    let deletedProduct = await Product.remove({ _id: new ObjectId(req.params.id) });
    res.json(deletedProduct);
  }
  catch (err) {
    res.status(500).send(err);
  }
});

app.post("/api/v1/edit-product/", async (req, res) => {


  await Product.updateOne({ _id: new ObjectId(req.body._id) }, req.body);
  let productFound = await Product.findOne({ _id: new ObjectId(req.body._id) });
  res.json(productFound);


});



/*
followed link: https://stackoverflow.com/questions/31519127/mongodb-search-and-sort-with-number-of-matches-and-exact-match
var sampleProduct1 = 'Apple MacBook Pro 13-Inch with Touch Bar Space Grey 1.4Ghz Quad Core 8th Gen i5/256 GB/2 Thunderbolt Ports';
var sampleProduct2 = "Samsung 7KG Front Load Washing Machine WW70J4373MA";
var sampleProduct3 = "My Milestones Muslin Baby 2 Layered Blanket Zoo Blue";

var sampleProduct = [
  "Apple MacBook Pro 13-Inch with Touch Bar Space Grey 1.4Ghz Quad Core 8th Gen i5/256 GB/2 Thunderbolt Ports",
  "Samsung 7KG Front Load Washing Machine WW70J4373MA",
  "My Milestones Muslin Baby 2 Layered Blanket Zoo Blue"
]

*/
app.post("/api/v1/get-products-listing/", async (req, res) => {
  let query = {};
  let skipRange = req.body.skipRange;
  let popular = req.body.popular;

  if (req.body.feature) { query.feature = req.body.feature; }

  let productsRaw;

  if (popular) {
    productsRaw = await Product.find(query).sort({ 'visitorCount': -1 }).limit(10).skip(skipRange);
  }
  else {
    productsRaw = await Product.find(query).limit(10).skip(skipRange);
  }



  let products = [];

  for (var productToCompare of productsRaw) {
    let product = productToCompare.toJSON();
    let comapretiveProduct = await findComparitiveProduct(productToCompare.productTitle);
    product.comparativeProducts = comapretiveProduct;
    products.push(product)
  }

  res.json(products);

});

async function findComparitiveProduct(productTitle) {
  let productList = [];
  let productsListRaw = await Product.find(
    { "$text": { "$search": productTitle } },
    { "score": { "$meta": "textScore" } }
  )
    .sort({ "score": { "$meta": "textScore" } })
    .limit(3);

  productsListRaw.map((product) => {
    product = product.toJSON();
    if (productList.length == 0) {
      productList.push(product);
    }
    else if (
      productList[productList.length - 1].score - product.score <= 1
      // && product.storeUrl !== productList[productList.length - 1].storeUrl
    ) {
      productList.push(product);
    }
  });

  // productList.shift();

  return productList;
}



module.exports = app;