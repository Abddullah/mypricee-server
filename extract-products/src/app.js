const express = require("express");
const Product = require("./models/product-modal.js");
const Scrapper = require("./models/scrapper-modal.js");
const ProductCategory = require("./models/product-category.js");
const ScrapperProgress = require("./models/scrapper-progress.js");
const cron = require("node-cron");
const internetAvailable = require("internet-available");

const UpdateProgress = require("./update-scrapper-progress");
const {
  updateProductScrappedLinks
} = UpdateProgress;

const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const ObjectId = require('mongoose').Types.ObjectId;
var cors = require('cors');
var http = require('http');

let browser;
let browserLaunched = false;
// let scrapperRunning = false;
let runningScrapperIDs = [];
let internetOnline = true;

cron.schedule("* * * * *", function () {
  console.log("Running Cron Job");
  checkIfScrapperRunning();
});

setInterval(() => {
  internetAvailable({
    timeout: 5000,
    retries: 5
  }).then(() => {
    // console.log("Internet available");
  }).catch(() => {
    internetOnline = false;
    if (browser && browser.close) {
      browser.close();
    }
    console.log("No internet");
  });
}, 10000);


async function checkIfScrapperRunning() {
  let scrapperProgressFound = await ScrapperProgress.find();
  // console.log(scrapperProgressFound);
  scrapperProgressFound.map(async (scrapperCheck, index) => {
    let scrapperId = scrapperCheck.scrapperId;
    if (scrapperCheck.productLinksToScrap && scrapperCheck.productLinksToScrap.length && scrapperCheck.productLinksToScrap.length > 0) {
      if (scrapperCheck.status === 'pending' || internetOnline !== true) {
        internetOnline = true;
        if (scrapperCheck.status === 'scrapping' || scrapperCheck.status === 'started') {
          await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'pending' });
        }
        scrapProducts(scrapperId, true);
      }
    }
    else {
      await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'noMoreLinks' });
    }

  })
}


async function resetScrapStatusToPending() {
  if (browser && browser.close) {
    browser.close();
    browserLaunched = false;
  }
  runningScrapperIDs.map(async (scrapperId, index) => {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'pending' });
  })


  // setTimeout(() => {
  //   checkIfScrapperRunning();
  // }, 10000)

}

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.on('error', function (err) {
  // handle the error safely
  console.log(err);
})


app.get("/", async (req, res) => {
  res.json({ tested: 'tested' });
})

app.get("/api/v1/extract-products/:id", async (req, res) => {
  let scrapperId = req.params.id
  scrapProducts(scrapperId);
  res.end();
})

async function scrapProducts(scrapperId) {
  console.log('api called', scrapperId);
  let scrapperProgress = await ScrapperProgress.findOne({ scrapperId: scrapperId });

  if (browserLaunched !== true) {
    browser = await puppeteer.launch({ headless: true, defaultViewport: null, args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'] });
    browserLaunched = true;
    browser.on('disconnected', async () => {
      console.log('disconnected*****************************');
      // await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'pending' });
      resetScrapStatusToPending();
      browserLaunched = false;
    });

  }

  if (scrapperProgress.status !== 'scrapping' && scrapperProgress.productLinksToScrap && scrapperProgress.productLinksToScrap.length && scrapperProgress.productLinksToScrap.length > 0) {
    // scrapperRunning = true;
    runningScrapperIDs.push(scrapperProgress.scrapperId);
    launchProductLink(scrapperProgress.scrapperId);
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'scrapping' });
  }
  else if (scrapperProgress.productLinksToScrap && scrapperProgress.productLinksToScrap.length && scrapperProgress.productLinksToScrap.length == 0) {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'noMoreLinks' });
  }

}


let maxNumberOfPages = 8;
let launchedPageCount = 0;
async function launchProductLink(scrapperId) {

  let scrapper = await Scrapper.findOne({ _id: new ObjectId(scrapperId) });
  let scrapperProgress = await ScrapperProgress.findOne({ scrapperId: scrapperId });
  let numberOfPagesToScrap = 1;

  if (scrapperProgress.productLinksToScrap.length && scrapperProgress.productLinksToScrap.length > 0) {
    for (var i = 0; i < numberOfPagesToScrap; i++) {
      let link = scrapperProgress.productLinksToScrap[i];
      if (link) {
        console.log(`Link ${i + 1}: ${link}`);
        updateProductScrappedLinks(scrapper._id, link);
        if (i === numberOfPagesToScrap - 1) {
          scrapProduct(scrapper, link, scrapperProgress, true);
        }
        else {
          scrapProduct(scrapper, link, scrapperProgress, false);
        }
      }
    }
  }
  else {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { status: 'noMoreLinks' });
  }
}

async function scrapProduct(scrapper, link, scrapperProgress, shouldCallAgain) {
  console.log('inside scrapProduct ');
  let page = await browser.newPage();
  launchedPageCount++;

  // if (shouldCallAgain) {
  //   updateProductScrappedLinks(scrapper._id, link);
  // }

  await page.setDefaultNavigationTimeout(0);


  await page.setRequestInterception(true);

  /// || req.resourceType() == 'image'
  page.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font') {
      req.abort();
    }
    else {
      req.continue();
    }
  });
  page
    .on('pageerror', async (err) => {
      console.log('pageerror', err);
      resetScrapStatusToPending();

      // await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { status: 'pending' });
    })
  // .on('requestfailed', async (err) => {
  //   console.log('requestfailed', err)
  //   await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { status: 'pending' });
  // })


  try {
    await page.goto(link);
    if (!scrapper.productImage.preActionQuery) {
      await page.waitForSelector(scrapper.productImage.imageQuery);
    }

    let product = await page.evaluateHandle(async (scrapper, link) => {

      let productTitle, productDescription, productImageRaw, productImages, productCategory, productCurrentPrice, productSlashedPrice, productRatting, productShipping;
      console.log('hello')

      if (scrapper.isProductTitle && scrapper.productTitle) {
        productTitle = document.querySelector(scrapper.productTitle);
        productTitle = productTitle ? productTitle.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productTitle;
      }

      if (scrapper.isProductDescription && scrapper.productDescription) {
        productDescription = document.querySelector(scrapper.productDescription);
        productDescription = productDescription ? productDescription.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productDescription;
      }

      if (scrapper.isProductCurrentPrice && scrapper.productCurrentPrice) {
        productCurrentPrice = document.querySelector(scrapper.productCurrentPrice);
        productCurrentPrice = productCurrentPrice ? productCurrentPrice.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productCurrentPrice;
      }

      if (scrapper.isProductSlashedPrice && scrapper.productSlashedPrice) {
        productSlashedPrice = document.querySelector(scrapper.productSlashedPrice);
        productSlashedPrice = productSlashedPrice ? productSlashedPrice.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productSlashedPrice;
      }

      if (scrapper.isProductRatting && scrapper.productRatting) {
        productRatting = document.querySelector(scrapper.productRatting);
        productRatting = productRatting ? productRatting.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productRatting;
      }

      if (scrapper.isProductShipping && scrapper.productShipping) {
        productShipping = document.querySelector(scrapper.productShipping);
        productShipping = productShipping ? productShipping.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productShipping;
      }

      /* 
      https://stackoverflow.com/questions/1981349/regex-to-replace-multiple-spaces-with-a-single-space
      category filteration
      */
      productCategory = [];
      if (scrapper.productCategory && scrapper.productCategory.query) {
        // productCategory = document.querySelector(scrapper.productCategory.query);
        // productCategory = productCategory ? productCategory.textContent : productCategory;

        var root = document.querySelector(scrapper.productCategory.query);
        if (root) {
          var iter = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
          var textnode;

          // print all text nodes
          while (textnode = iter.nextNode()) {
            // console.log(textnode.textContent)
            if (textnode.textContent.trim().trim().replace(/\s\s+/g, '').toLowerCase() !== 'home' &&
              textnode.textContent.trim().trim().replace(/\s\s+/g, '').toLowerCase() !== productTitle &&
              textnode.textContent.trim().trim().replace(/\s\s+/g, '') !== ''
            ) {
              productCategory.push(textnode.textContent.trim().replace(/\s\s+/g, ''))
            }
          }
        }

        // productCategory = productCategory ? productCategory.textContent.trim().replace(/\s\s+/g, ',').split(',') : productCategory;
        // if (productCategory && productCategory.length && productCategory.length > 0 && productCategory[productCategory.length - 1] == productTitle && productCategory[0].toLowerCase() == 'home') {
        //   productCategory = productCategory.slice(1, productCategory.length - 1);
        // }
        // else if (productCategory && productCategory.length && productCategory.length > 0 && productCategory[productCategory.length - 1] == productTitle) {
        //   productCategory = productCategory.slice(0, productCategory.length - 1);
        // }
        // else if (productCategory && productCategory.length && productCategory.length > 0 && productCategory[0].toLowerCase() == 'home') {
        //   productCategory = productCategory.slice(1);          
        // }
      }

      productImages = [];
      if (scrapper.productImage.queryType === 'img') {
        if (!scrapper.productImage.preActionQuery) {
          productImageRaw = [...document.querySelectorAll(scrapper.productImage.imageQuery)];
          productImages = productImageRaw.map(img => img.src)
        }
        else {
          if (scrapper.productImage.eventName === 'click') {
            let productImageRawClickable = [...document.querySelectorAll(scrapper.productImage.preActionQuery)];
            console.log(productImageRawClickable, 'productImageRawClickable')
            productImageRawClickable.map((img) => { img.click() });

            await new Promise(async (resolve, reject) => {
              setTimeout(() => { resolve() }, 100);
            })


            productImageRaw = [...document.querySelectorAll(scrapper.productImage.imageQuery)];

            console.log('ssksksksk', productImageRaw, scrapper.productImage.imageQuery)
            productImages = productImageRaw.map(img => img.src)
            // productImages = productImageRaw.map((img) => {
            //   console.log(img,'imgmgimgimg');
            //   img.click()
            // })
          }
          // else {
          // }
        }
      }
      else if (scrapper.productImage.queryType === 'a') {
        productImageRaw = [...document.querySelectorAll(scrapper.productImage.imageQuery)];
        productImages = productImageRaw.map(a => a.href)
      }
      else {
        if (!scrapper.productImage.preActionQuery) {
          productImageRaw = [...document.querySelectorAll(scrapper.productImage.imageQuery)];
          productImages = productImageRaw.map((element) => {
            var imageUrl = element.style.backgroundImage.replace('url(', '').replace(')', '').replace(/\"/gi, "");
            if (imageUrl.slice(0, 4) !== 'http') {
              var url = new URL(link);
              url.pathname = imageUrl;
              imageUrl = url.href;
            }

            return imageUrl;
          })

        }
      }
      return JSON.stringify({
        productTitle: productTitle,
        productDescription: productDescription,
        productCurrentPrice: productCurrentPrice,
        productRatting: productRatting,
        productSlashedPrice: productSlashedPrice,
        productShipping: productShipping,
        storeUrl: scrapper.storeInformation.storeUrl,
        productCategory: productCategory,
        productImages: productImages,
        productLink: link,
        createdAt: (new Date()).getTime()
      });
    }, scrapper, link);

    if (product) {
      product = JSON.parse(product._remoteObject.value);
      await saveProductCategories(product.productCategory, product.storeUrl);
      // console.log(product, 'Product Details');
      if (product.productTitle && product.productImages && product.productImages.length && product.productImages.length > 0 && product.productCurrentPrice) {
        saveProductInDB(product);
      }
    }

  }
  catch (e) {
    console.log(e, 'eee inside error');
  }

  try {
    await page.close();
  }
  catch (e) {
    console.log('an error occured in closing', e);
  }
  launchedPageCount--;

  if (shouldCallAgain) {
    launchProductLink(scrapperProgress.scrapperId);
  }

}



async function saveProductInDB(productDetails) {
  console.log(new Date(), (new Date).getTime());
  try {

    let productFound = await Product.findOne({ productLink: productDetails.productLink });
    let priceHistoryClone;

    if (productFound && productFound.priceHistory && productFound.priceHistory.length && productFound.priceHistory.length > 0) {
      priceHistoryClone = productFound.priceHistory.slice(0);
    }
    else {
      priceHistoryClone = [];
    }

    let newPrice = { scrappedDateTime: (new Date()).getTime(), price: productDetails.productCurrentPrice };
    priceHistoryClone.push(newPrice);
    productDetails.priceHistory = priceHistoryClone;
    await Product.updateOne({ productLink: productDetails.productLink }, productDetails, { upsert: true });

    console.log(productDetails.productLink, '-Product updated in DB-');
  }
  catch (err) {
    console.log(err, 'err');
  }
}


async function saveProductCategories(categories, link) {
  categories.map(async (category) => {
    let categoryToSave = {
      storeUrl: link,
      categoryName: category,
      createdAt: (new Date()).getTime()
    }
    await ProductCategory.updateOne({ categoryName: category }, categoryToSave, { upsert: true });
  })
}






























































// async function saveProductCategories(categories, link) {
//   // ProductCategory
//   // console.log(categories, 'categories', link);
//   // if (categories && categories.length && categories.length > 0) {
//   categories.map(async (category) => {
//     let categoryToSave = {
//       storeUrl: link,
//       categoryName: category,
//       createdAt: (new Date()).getTime()
//     }
//     await ProductCategory.updateOne({ categoryName: category }, categoryToSave, { upsert: true });
//   })
//   // }
// }


// function startKeepAlive() {
//   setInterval(function () {
//     var options = {
//       host: 'https://mypricee-01.herokuapp.com',
//       port: 80,
//       path: '/'
//     };
//     http.get(options, function (res) {
//       res.on('data', function (chunk) {
//         try {
//           // optional logging... disable after it's working
//           console.log("HEROKU RESPONSE: " + chunk);
//         } catch (err) {
//           console.log(err.message);
//         }
//       });
//     }).on('error', function (err) {
//       console.log("Error: " + err.message);
//     });
//   }, 5 * 60 * 1000); // load every 5 minutes
// }

// startKeepAlive();







module.exports = app;