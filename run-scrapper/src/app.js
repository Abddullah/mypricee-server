const express = require("express");
const Product = require("./models/product-modal.js");
const Scrapper = require("./models/scrapper-modal.js");
const ProductCategory = require("./models/product-category.js");
const ScrapperProgress = require("./models/scrapper-progress.js");
const axios = require('axios');
const UpdateProgress = require("./update-scrapper-progress");
const {
  updateCatLinkProgress,
  updateProductLinkToScrap,
  initializeScrapperProgress,
  addCatLinksToScrap,
  initializeCatLinksToScrap
} = UpdateProgress;

const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const ObjectId = require('mongoose').Types.ObjectId;
var cors = require('cors');
var http = require('http');
const cron = require("node-cron");
const internetAvailable = require("internet-available");

let browser;
let browserLaunched = false;
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
    console.log("Internet available");
  }).catch(() => {
    internetOnline = false;
    if (browser && browser.close) {
      browser.close();
    }
    console.log("No internet");
  });
}, 10000);

const timer = ms => new Promise(res => setTimeout(res, ms))

async function checkIfScrapperRunning() {
  let scrapperProgressFound = await ScrapperProgress.find();

  scrapperProgressFound.map(async (scrapperCheck, index) => {

    let scrapperId = scrapperCheck.scrapperId;
    if (scrapperCheck.catLinksToScrap && scrapperCheck.catLinksToScrap.length && scrapperCheck.catLinksToScrap.length > 0) {
      console.log(scrapperCheck.catStatus, 'inside autoScrollWithoutClick',scrapperCheck.catLinksToScrap[0]);
      if (scrapperCheck.catStatus === 'pending' || internetOnline !== true) {
        internetOnline = true;
        if (scrapperCheck.catStatus === 'scrapping' || scrapperCheck.catStatus === 'started') {
          await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { catStatus: 'pending' });
        }
        let scrapper = await Scrapper.findOne({ _id: new ObjectId(scrapperId) });
        if (scrapperCheck.paginationType === 'autoScrollWithoutClick') {
          console.log(scrapperCheck.catStatus, 'inside autoScrollWithoutClick')
          extractProductURLsFromCatLinks(scrapper, [...scrapperCheck.catLinksToScrap], autoScrollWithoutClick);
        }
        else if (scrapperCheck.paginationType === 'autoScroll') {
          extractProductURLsFromCatLinks(scrapper, [...scrapperCheck.catLinksToScrap], autoScroll);
        }
      }
    }
    else {
      await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { catStatus: 'noMoreLinks' });
    }
    console.log('back to back1');
    await timer(10000);
    console.log('back to back2');

  })
}

async function resetScrapStatusToPending() {
  if (browser && browser.close) {
    browser.close();
    browserLaunched = false;
  }
  runningScrapperIDs.map(async (scrapperId, index) => {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapperId) }, { catStatus: 'pending' });
  });

  console.log('error occurred');
  // setTimeout(() => {
  //   checkIfScrapperRunning();
  // }, 10000)
}

app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.json({ tested: 'tested' });
})

app.get("/api/v1/test-scrapper/:id", async (req, res) => {
  // let fetchedScrapper, categoryLinks;
  let scrapper = await Scrapper.findOne({ _id: new ObjectId(req.params.id) });
  scrapper = scrapper.toObject();

  // let allProducts = await Product.find({});
  // console.log(allProducts, allProducts.length)
  console.log(scrapper);
  // if (scrapper && !scrapper.started) {
  scrapper.started = true;

  await Scrapper.updateOne({ _id: new ObjectId(scrapper._id) }, scrapper);

  initializeScrapperProgress(scrapper._id);
  if (browserLaunched !== true) {
    browser = await puppeteer.launch({ headless: true, defaultViewport: null, args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'] });
    browserLaunched = true;
    browser.on('disconnected', () => {
      resetScrapStatusToPending();
      browserLaunched = false;
    });
  }
  fetchCategories(scrapper);
  // }
  res.json(scrapper);
  // res.end()

  // try {
  //   categoryLinks = await makeCategoriesLink(scrapper);
  //   categoryLinks = JSON.parse(categoryLinks);
  //   console.log(categoryLinks, 'categoryLinks');
  //   // let productLinks = await makeProductsLink(categoryLinks, "a.product-list__thumb");
  //   makeProductsLink(categoryLinks, scrapper);
  //   // console.log(productLinks, '**productsLinkproductsLink**')
  //   // res.json(productLinks);
  //   res.end();
  // }
  // catch (err) {
  //   res.status(500).send(err);
  // }
})

async function fetchCategories(scrapper) {
  if (scrapper.categoryUrl.preAction && scrapper.categoryUrl.preAction.length && scrapper.categoryUrl.preAction.length > 0 && scrapper.categoryUrl.categoryURLQuery) {
    getCategoriesWithPreactionAndQuery()
  }
  else if (scrapper.categoryUrl.preAction && scrapper.categoryUrl.preAction.length && scrapper.categoryUrl.preAction.length > 0 && !scrapper.categoryUrl.categoryURLQuery) {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { paginationType: 'autoScroll' });
    getCategoriesWithPreaction(scrapper);
  }
  else {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { paginationType: 'autoScrollWithoutClick' });
    getCategoriesWithQuery(scrapper)
  }
}

async function getCategoriesWithQuery(scrapper) {
  let page = await browser.newPage();
  process.on("unhandledRejection", async (reason, p) => {
    console.error("-- Unhandled Rejection at: Promise", p, "reason:", reason);
    // browser.close();
    scrapper.started = false;
    console.log(1);
    await Scrapper.updateOne({ _id: new ObjectId(scrapper._id) }, scrapper);
  });

  await page.setDefaultNavigationTimeout(0);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font') {
      req.abort();
    }
    else {
      req.continue();
    }
  });

  await page.goto(scrapper.storeInformation.storeUrl, { waitUntil: 'networkidle0' });

  let categoryURLs = await page.evaluateHandle((scrapper) => {
    let elementAchor = [...document.querySelectorAll(scrapper.categoryUrl.categoryURLQuery)]
    let productURLs = elementAchor.map(a => a.href);
    return JSON.stringify(productURLs)
  }, scrapper);

  categoryURLs = JSON.parse(categoryURLs._remoteObject.value);
  categoryURLs = categoryURLs.filter((v, i, a) => a.indexOf(v) === i);
  console.log(categoryURLs, 'categoryURLscategoryURLs')
  initializeCatLinksToScrap(scrapper._id, categoryURLs);
  extractProductURLsFromCatLinks(scrapper, categoryURLs, autoScrollWithoutClick);

}

async function extractProductURLsFromCatLinks(scrapper, categoryURLs, scrollFunc) {
  console.log(scrollFunc, 'scrollFunc');
  runningScrapperIDs.push(scrapper._id);
  if (browserLaunched !== true) {

    if (browser && browser.close) {
      browser.close();
    }

    browser = await puppeteer.launch({ headless: true, defaultViewport: null, args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'] });
    browserLaunched = true;
    browser.on('disconnected', async () => {
      console.log('disconnected*****************************');
      resetScrapStatusToPending();
      browserLaunched = false;
    });
  }

  let scrapperProgress = await ScrapperProgress.findOne({ scrapperId: scrapper._id });
  // console.log('pppppppppppppppppppppppppppppppppppppppppp', categoryURLs, scrollFunc);
  if (scrapperProgress.catStatus !== 'scrapping' && categoryURLs && categoryURLs.length && categoryURLs.length > 0) {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { catStatus: 'scrapping' });
    for (var i = 0; i < categoryURLs.length; i++) {
      if (categoryURLs[i]) {
        await extractProductUrls(scrapper, categoryURLs[i], scrollFunc);
      }
      updateCatLinkProgress(scrapper._id, categoryURLs[i]);
    }
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { catStatus: 'noMoreLinks' });
    // browser.close();
  }
  else if (scrapperProgress.catLinksToScrap && scrapperProgress.catLinksToScrap.length && scrapperProgress.catLinksToScrap.length == 0) {
    await ScrapperProgress.updateOne({ scrapperId: new ObjectId(scrapper._id) }, { catStatus: 'noMoreLinks' });
  }
  // scrapper.started = false;
  // await Scrapper.updateOne({ _id: new ObjectId(scrapper._id) }, scrapper);
}

async function extractProductUrls(scrapper, link, scrollFunc) {
  console.log(link, '-----------------------------Category Link-----------------------------', scrollFunc);
  let productPage = await browser.newPage();
  await productPage.setDefaultNavigationTimeout(0);
  await productPage.setRequestInterception(true);
  productPage.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
      req.abort();
    }
    else {
      req.continue();
    }
  });
  productPage
    .on('pageerror', async (err) => {
      console.log('pageerror---------------------------------------', err);
      // resetScrapStatusToPending();
    })
  // .on('requestfailed', async (req) => {
  //   console.log('requestfaild---------------------------------------', req.resourceType());
  //   if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image' || req.resourceType() == 'document') {
  //     console.log('inside if line 255')
  //   }
  //   else {
  //     console.log('requestfaild--------------------------------------- 258', req.resourceType())
  //     resetScrapStatusToPending();
  //   }
  // })

  try {
    await productPage.goto(link, { waitUntil: 'networkidle0' });
    await loadMoreProducts(scrapper, productPage, scrollFunc, link);
  }
  catch (e) {
    // resetScrapStatusToPending();
    console.log('error occurred', e);
    await productPage.close();
  }
  await productPage.close();

}


let categoryPageindex = 0;
let categoryPagesLength;
async function getCategoriesWithPreaction(scrapper) {
  // await page.goto(scrapper.storeInformation.storeUrl, { waitUntil: 'networkidle2' });
  callNextPage(scrapper, categoryPageindex);
}

async function callNextPage(scrapper, categoryPageindex) {
  let page = await browser.newPage();
  process.on("unhandledRejection", async (reason, p) => {
    console.error("-- Unhandled Rejection at: Promise", p, "reason:", reason);
    // browser.close();
    scrapper.started = true;

    await Scrapper.updateOne({ _id: new ObjectId(scrapper._id) }, scrapper);
  });
  // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
  await page.setViewport({ width: 1600, height: 757 });

  await page.setDefaultNavigationTimeout(0);

  await page.goto(scrapper.storeInformation.storeUrl, { waitUntil: 'domcontentloaded' });


  for (var i = 0; i < scrapper.categoryUrl.preAction.length; i++) {
    categoryPagesLength = await preActionCalled(scrapper, page, categoryPageindex, i);
    // if (categoryPagesLength && categoryPagesLength.productURLs && categoryPagesLength.productURLs.length && categoryPagesLength.productURLs.length > 0) {
    //   console.log('inside for if', categoryPagesLength);
    //   await getProductsLink(scrapper, categoryPagesLength.productURLs);
    // }
  }

  if (categoryPagesLength && categoryPagesLength.categoryPageCount > categoryPageindex + 1) {
    categoryPageindex++;
    callNextPage(scrapper, categoryPageindex);
  }
  else if (categoryPagesLength && categoryPagesLength.categoryPageCount <= categoryPageindex + 1) {
    categoryPageindex = 0;
    categoryPagesLength = undefined;
    getPrdLinksFromCatLinks(scrapper);
  }
  page.close();
}

async function getPrdLinksFromCatLinks(scrapper) {
  let scrapperProgress = await ScrapperProgress.findOne({ scrapperId: new ObjectId(scrapper._id) });
  console.log(scrapperProgress, 'scrapperProgress');
  initializeCatLinksToScrap(scrapper._id, scrapperProgress.catLinksToScrap);
  extractProductURLsFromCatLinks(scrapper, scrapperProgress.catLinksToScrap, autoScroll);
}

let categoryLinksFound;
let pageClone;
async function preActionCalled(scrapper, page, categoryPageindex, preActionIndex) {
  let actionCalled;
  let preAction = scrapper.categoryUrl.preAction[preActionIndex];

  if (preAction.eventName === 'click') {

    // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    // if (!categoryLinksFound) {
    await page.waitForSelector(`${preAction.preActionQuery}`);
    categoryLinksFound = await page.$$(`${preAction.preActionQuery}`);
    // }

    console.log(categoryPageindex, '------111');


    await categoryLinksFound[categoryPageindex].click();
    console.log('actionCalled 111');
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(scrapper.productUrl);
    pageClone = page;
    // await autoScroll(page, scrapper);

    console.log('actionCalled 222');
    const catUrl = await page.url();
    console.log("Page URL : " + catUrl);

    addCatLinksToScrap(scrapper._id, catUrl);

    await page.exposeFunction('loadMore', async (scrapper) => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click(`${scrapper.paginationQuery}`),
      ]);
    })

    // await loadMoreProducts(scrapper, page, autoScroll);

    actionCalled = { categoryPageCount: categoryLinksFound.length }
  }
  if (preAction.eventName === 'hover') {
    await page.waitForSelector(preAction.preActionQuery);
    actionCalled = page.hover(preAction.preActionQuery);
  }
  return actionCalled;
}

async function loadMoreProducts(scrapper, page, scrollNow, link) {
  async function loadProductsAsync(scrapper, page, startingIndex) {
    return new Promise(async (resolve, reject) => {
      console.log(startingIndex, 'startingIndex');

      let productURLs = await page.evaluateHandle((scrapper, startingIndex) => {
        let elementAchor = [...document.querySelectorAll(scrapper.productUrl)].slice(startingIndex);
        let productURLs = elementAchor.map(a => a.href);
        return JSON.stringify(productURLs)
      }, scrapper, startingIndex);
      productURLs = JSON.parse(productURLs._remoteObject.value);

      console.log('productURLs', productURLs.length);
      if (productURLs && productURLs.length && productURLs.length > 0) {
        console.log(productURLs.length, 'actionCalled');
        // await getProductsLink(scrapper, productURLs);

        updateProductLinkToScrap(scrapper._id, productURLs);

        try {
          await axios.get(`http://localhost:7010/api/v1/extract-products/${scrapper._id}`);
        }
        catch (e) {
          console.log(e, 'axios error line 275');
        }


        console.log(link, '-------------------First Product Fetching Done----------------------', scrollNow)
        // await scrollNow(page, scrapper);
        await scrollNow(page, scrapper);
        await loadProductsAsync(scrapper, page, startingIndex + productURLs.length + 1);
        console.log('-------------------Second----------------------', loadProductsAsync, productURLs.length + 1)
        resolve();
      }
      else {
        resolve();
      }
    })

  }

  return loadProductsAsync(scrapper, page, 0);

}



// https://stackoverflow.com/questions/51529332/puppeteer-scroll-down-until-you-cant-anymore
async function autoScroll(page, scrapper) {
  return new Promise(async (resolve, reject) => {

    await page.evaluate(async (scrapper) => {
      window.scrollBy(0, document.body.scrollHeight);
      let element = document.querySelector(scrapper.paginationQuery);
      if (element) {
        element.click();
      }
      window.scrollBy(0, document.body.scrollHeight);
    }, scrapper);
    try {
      await page.waitForSelector(scrapper.paginationQuery);
      console.log('hello scroll')
      return resolve();
    }
    catch (e) {
      console.log('hello scroll')
      return resolve();
    }
  });
}

async function autoScrollWithoutClick(page, scrapper) {
  await page.evaluate(async (scrapper) => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        // loadMore(scrapper);

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }, scrapper);
}



// async function autoScroll(page, scrapper) {
//   const scrollPage = async (page, scrapper) => {
//     return new Promise(async (resolve, reject) => {

//       await page.evaluate(async () => {
//         var scrollHeight = document.body.scrollHeight;
//         window.scrollBy(0, scrollHeight);
//       });

//       try {

//         await page.click(`${scrapper.paginationQuery}`)
//         // resolve();
//         resolve(await scrollPage(page, scrapper));
//       }
//       catch (e) {
//         resolve();
//         console.log(e, 'inside autoScroll');
//       }
//     })
//   }
//   return await scrollPage(page, scrapper);
// };

let numberOfPagesOpened = 0;
let hasPageOpened = false;
function checkOpenedPages(t) {
  return new Promise(resolve => {
    let timeCheckInterval = setInterval(() => {
      if (hasPageOpened && numberOfPagesOpened === 0) {
        console.log(numberOfPagesOpened);
        clearInterval(timeCheckInterval);
        resolve();
      }
    }, t);
  });
}
async function getProductsLink(scrapper, productUrl) {
  console.log(productUrl, productUrl.length, 'scrapper, productUrl');
  for (var i = 0; i < productUrl.length; i = i + 16) {
    // if (i + 10 <= productUrl.length) {
    await get10ProductsAtOnce(scrapper, productUrl.slice(i, i + 16));
    // }
    // else {
    // await get10ProductsAtOnce(scrapper, productUrl);
    // }
    await checkOpenedPages(2000);
  }
  hasPageOpened = false;
}

async function get10ProductsAtOnce(scrapper, links) {
  links.map(async (link, index) => {
    if (link) {
      hasPageOpened = true;
      console.log(`Link ${link} ${index} called.`);

      let page = await browser.newPage();
      await page.setDefaultNavigationTimeout(0);

      // await page.setRequestInterception(true);
      // let imagesArr = [];
      // page.on('request', (req) => {

      //   if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font') {
      //     // if (req.resourceType() == 'image') {
      //     //   imagesArr.push(req.url())
      //     // }
      //     // console.log(imagesArr, 'imagesArr------------------------', req.url(), req)

      //     req.abort();
      //   }
      //   else {
      //     req.continue();
      //   }
      // });


      numberOfPagesOpened++
      await page.goto(link);
      // if (scrapper.productImage.preActionQuery) {
      // }
      try {
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
          console.log(product, 'Product Details');
          if (product.productTitle && product.productImages && product.productImages.length && product.productImages.length > 0 && product.productCurrentPrice) {
            saveProductInDB(product);
          }
        }

      }
      catch (e) {
        console.log(e, 'eee inside error')
      }

      try {
        await page.close();
      }
      catch (e) {
        console.log('an error occured in closing', e);
      }
      numberOfPagesOpened--
    }

  });
  console.log(`outside loop123`);
}

async function saveProductInDB(productDetails) {
  // var product = new Product(productDetails);
  console.log(new Date(), (new Date).getTime());
  try {
    // const savedProduct = await product.save();
    await Product.updateOne({ productLink: productDetails.productLink }, productDetails, { upsert: true });
    console.log('Product updated in DB');
  }
  catch (err) {
    console.log(err, 'err');
  }
}


async function saveProductCategories(categories, link) {
  // ProductCategory
  // console.log(categories, 'categories', link);
  // if (categories && categories.length && categories.length > 0) {
  categories.map(async (category) => {
    let categoryToSave = {
      storeUrl: link,
      categoryName: category,
      createdAt: (new Date()).getTime()
    }
    await ProductCategory.updateOne({ categoryName: category }, categoryToSave, { upsert: true });
  })
  // }
}


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