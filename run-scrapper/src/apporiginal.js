const express = require("express");
const Product = require("./models/product-modal.js");
const Scrapper = require("./models/scrapper-modal.js");
const ProductCategory = require("./models/product-category.js");

const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const ObjectId = require('mongoose').Types.ObjectId;
var cors = require('cors');

// var http = require('http'); //importing http

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





let browser;


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

  browser = await puppeteer.launch({ headless: true, defaultViewport: null, args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'] });
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
    getCategoriesWithPreaction(scrapper)
  }
  else {
    getCategoriesWithQuery(scrapper)
  }
}

async function getCategoriesWithQuery(scrapper) {
  let page = await browser.newPage();
  process.on("unhandledRejection", async (reason, p) => {
    console.error("-- Unhandled Rejection at: Promise", p, "reason:", reason);
    browser.close();
    scrapper.started = false;
    console.log(1);
    await Scrapper.updateOne({ _id: new ObjectId(scrapper._id) }, scrapper);
  });

  await page.setDefaultNavigationTimeout(0);

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
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
  console.log(categoryURLs.length, ' ------------------categoryURLs')

  for (var i = 0; i < categoryURLs.length; i++) {
    if (categoryURLs[i]) {
      console.log(categoryURLs[i], i, '**--cccccccccccccccccccccccccccccccccccccccccccccccccccccccc*-*-');
      await extractProductUrls(scrapper, categoryURLs[i]);
    }
    console.log('--**** category urls')
  }
  scrapper.started = false;
  await Scrapper.updateOne({ _id: new ObjectId(scrapper._id) }, scrapper);
}

async function extractProductUrls(scrapper, link) {
  console.log(link, '-----------------------------Category Link-----------------------------');
  let productPage = await browser.newPage();
  await productPage.setDefaultNavigationTimeout(0);
  await productPage.goto(link, { waitUntil: 'networkidle2' });

  await loadMoreProducts(scrapper, productPage, autoScrollWithoutClick);

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
    browser.close();
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
  }
  page.close();
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


    await page.exposeFunction('loadMore', async (scrapper) => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click(`${scrapper.paginationQuery}`),
      ]);

    })

    await loadMoreProducts(scrapper, page, autoScroll);

    actionCalled = { categoryPageCount: categoryLinksFound.length }
  }
  if (preAction.eventName === 'hover') {
    await page.waitForSelector(preAction.preActionQuery);
    actionCalled = page.hover(preAction.preActionQuery);
  }
  return actionCalled;
}

async function loadMoreProducts(scrapper, page, scrollNow) {
  async function loadProductsAsync(scrapper, page, startingIndex) {
    return new Promise(async (resolve, reject) => {
      console.log(startingIndex, 'startingIndex')
      let productURLs = await page.evaluateHandle((scrapper, startingIndex) => {
        let elementAchor = [...document.querySelectorAll(scrapper.productUrl)].slice(startingIndex);
        let productURLs = elementAchor.map(a => a.href);
        return JSON.stringify(productURLs)
      }, scrapper, startingIndex);

      productURLs = JSON.parse(productURLs._remoteObject.value);
      console.log('productURLs', productURLs.length)
      if (productURLs && productURLs.length && productURLs.length > 0) {
        console.log(productURLs.length, 'actionCalled');
        await getProductsLink(scrapper, productURLs);
        console.log('-------------------First Product Fetching Done----------------------')
        await scrollNow(page, scrapper);
        await loadProductsAsync(scrapper, page, startingIndex + productURLs.length + 1);
        console.log('-------------------Second----------------------', loadProductsAsync, productURLs.length + 1)

        // return resolve();
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

      try {
        await loadMore(scrapper);
      }
      catch (e) {
        console.log(e, 'inside scroll')
      }
    }, scrapper);

    return resolve();

  });

}

async function autoScrollWithoutClick(page, scrapper) {
  await page.evaluate(async (scrapper) => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, document.body.scrollHeight);
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
  // await get10ProductsAtOnce(scrapper, productUrl);
  // await checkOpenedPages(3000);
  console.log('link called');
  for (var i = 0; i < productUrl.length; i = i + 10) {
    await get10ProductsAtOnce(scrapper, productUrl.slice(i, i + 10));
    await checkOpenedPages(3000);
  }
  hasPageOpened = false;
}

async function get10ProductsAtOnce(scrapper, links) {
  links.map(async (link, index) => {

    hasPageOpened = true;
    let shouldScrapeLink = await checkProductExistance(link);
    // console.log(shouldScrapeLink, 'shouldScrapeLink');
    console.log(`Link ${link} ${index} called. Should scrape ${shouldScrapeLink}`, shouldScrapeLink);
    if (link && shouldScrapeLink) {
      numberOfPagesOpened++

      let page = await browser.newPage();
      // let page = pages[index]
      await page.setDefaultNavigationTimeout(0);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
          req.abort();
        }
        else {
          req.continue();
        }
      });

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
            createdAt: (new Date()).getTime(),
            lastUpdate: (new Date()).getTime()
          });
        }, scrapper, link);

        if (product) {
          product = JSON.parse(product._remoteObject.value);
          await saveProductCategories(product.productCategory, product.storeUrl, product.productTitle);
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


async function saveProductCategories(categories, link, productTitle) {
  // ProductCategory
  // console.log(categories, 'categories', link);
  // if (categories && categories.length && categories.length > 0) {
  categories.map(async (category) => {
    console.log(productTitle.toLowerCase(), category.toLowerCase(), productTitle.toLowerCase() !== category.toLowerCase());
    if (productTitle.toLowerCase() !== category.toLowerCase() && category.toLowerCase() !== 'home') {
      let categoryToSave = {
        storeUrl: link,
        categoryName: category,
        createdAt: (new Date()).getTime()
      }
      await ProductCategory.updateOne({ categoryName: category }, categoryToSave, { upsert: true });
    }
  })
  // }
}


async function checkProductExistance(productUrl) {
  return new Promise(async (resolve, reject) => {
    let productFound = await Product.findOne({ productLink: productUrl });
    let shouldScrap;
    if (productFound && productFound.lastUpdate) {
      // console.log('inside promise', (new Date()).getTime() - productFound.lastUpdate > 86400000, (new Date()).getTime(), productFound.lastUpdate, 86400000);
      shouldScrap = (new Date()).getTime() - productFound.lastUpdate > 86400000;
    }
    else {
      shouldScrap = true;
    }
    // console.log(shouldScrap, 'productFound', productUrl)

    resolve(shouldScrap);
  })
}


// async function getProductImages(scrapper) {
//   let productImages = [];
//   if (scrapper.productImage.queryType === 'img') {
//     if (!scrapper.productImage.preActionQuery) {
//       productImages = [...document.querySelectorAll(scrapper.productImage.imageQuery)];
//     }
//   }
//   return productImages;
// }


// async function makeCategoriesLink(scrapper) {
//   return new Promise(async (resolve, reject) => {
//     const page = await browser.newPage();
//     const query = scrapper.categoryLink.linkRef;
//     await page.goto(scrapper.categoryUrl, { waitUntil: 'networkidle2' });
//     const categoryLinks = await page.evaluateHandle((query) => {
//       let elementAchor = [...document.querySelectorAll(query)]
//       let links = elementAchor.map(a => a.href);
//       return JSON.stringify(links);
//     }, query);
//     // await browser.close();
//     page.close();
//     resolve(categoryLinks._remoteObject.value)
//   })
// }


// async function makeProductsLink(categoryUrls, scrapper) {
//   // return new Promise(async (resolve, reject) => {
//   const extractCategoryPages = async (url, scrapper) => {
//     // Scrape the data we want
//     const page = await browser.newPage();
//     await page.goto(url);
//     let nextPageUrl = await page.evaluateHandle((scrapper) => {
//       let pagerLink = document.querySelector(scrapper.pagerQuery);
//       console.log(pagerLink, 'pagerLinkpagerLink');
//       return pagerLink ? JSON.stringify({ link: pagerLink.href }) : JSON.stringify({ link: '' })
//     }, scrapper);
//     await page.close();
//     if (nextPageUrl) {
//       nextPageUrl = JSON.parse(nextPageUrl._remoteObject.value);
//       console.log(nextPageUrl, 'nextPageUrlnextPageUrl');
//       getProductsLinks(nextPageUrl.link, scrapper);
//     }
//     if (URLLen <= currentIndex + 1) {
//       console.log(nextPageUrl, 'All links products scrapped.')
//     }
//     else {
//       currentIndex = currentIndex + 1;
//       const nextUrl = categoryUrls[currentIndex];
//       await extractCategoryPages(nextUrl, scrapper);
//     }
//   };

//   var URLLen = categoryUrls.length;
//   var currentIndex = 0;
//   const firstUrl = URLLen > -1 ? categoryUrls[currentIndex] : '';
//   const productsLink = await extractCategoryPages(firstUrl, scrapper);
//   //   resolve(productsLink);

//   // });
// }


// async function getProductsLinks(nextPageUrl, scrapper) {
//   console.log('inside another product link function', nextPageUrl);
//   // return new Promise(async (resolve, reject) => {
//   if (nextPageUrl) {
//     let url = nextPageUrl;
//     const page = await browser.newPage();
//     await page.goto(url);
//     let productLinks = await page.evaluateHandle((scrapper) => {
//       let elementsAnchorNotArr = document.querySelectorAll(scrapper.productLink.linkRef);
//       if (elementsAnchorNotArr) {
//         let elementAchor = [...elementsAnchorNotArr];
//         let links = elementAchor.map(a => a.href);
//         return JSON.stringify(links);
//       }
//       else {
//         return JSON.stringify([]);
//       }
//     }, scrapper);
//     page.close();
//     if (productLinks) {
//       productLinks = JSON.parse(productLinks._remoteObject.value);
//       console.log(productLinks, 'productLinks 565656');
//       if (productLinks.length && productLinks.length > 0) {
//         getProducts(productLinks, scrapper);
//         await nextURLCall(nextPageUrl, scrapper);
//       } else {
//         // resolve();
//       }
//     } else {
//       // resolve();
//     }
//   }
//   // else { resolve(); }
//   // })
// }


// async function nextURLCall(nextPageUrl, scrapper) {
//   const urlSplit = nextPageUrl.split(/page=(\d+)$/);
//   const nextPageNumber = parseInt(urlSplit[1]) + 1;
//   const nextURL = `${urlSplit[0]}page=${nextPageNumber}${urlSplit[2] ? urlSplit[2] : ''}`;
//   console.log(nextURL, 'nextURLnextURL');
//   getProductsLinks(nextURL, scrapper);
// }


// async function getProducts(productLinks, scrapper) {
//   // return new Promise(async (resolve, reject) => {
//   // console.log(productLinks, 'productLinksproductLinks*-*-*-*');

//   const getProductsItems = async (url, scrapper) => {
//     console.log(url, 'inside get products promise*-*-*-*123');
//     const page = await browser.newPage();
//     try {
//       await page.goto(url);
//     }
//     catch (e) {
//       console.log(e, 'eeee');
//     }
//     let productDetails;
//     try {
//       productDetails = await page.evaluateHandle((scrapper, url) => {
//         let productTitle, productDescription, productImageRaw, productImages, productCategory, productCurrentPrice, productSlashedPrice, productRatting, productShipping;

//         if (scrapper.productName) {
//           productTitle = document.querySelector(scrapper.productName.linkRef);
//           productTitle = productTitle ? productTitle.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productTitle;
//         }

//         if (scrapper.productDescription) {
//           productDescription = document.querySelector(scrapper.productDescription.linkRef);
//           productDescription = productDescription ? productDescription.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productDescription;
//         }

//         if (scrapper.productCurrentPrice) {
//           productCurrentPrice = document.querySelector(scrapper.productCurrentPrice.linkRef);
//           productCurrentPrice = productCurrentPrice ? productCurrentPrice.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productCurrentPrice;
//         }

//         if (scrapper.productSlashedPrice) {
//           productSlashedPrice = document.querySelector(scrapper.productSlashedPrice.linkRef);
//           productSlashedPrice = productSlashedPrice ? productSlashedPrice.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productSlashedPrice;
//         }

//         if (scrapper.productRatting) {
//           productRatting = document.querySelector(scrapper.productRatting.linkRef);
//           productRatting = productRatting ? productRatting.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productRatting;
//         }

//         if (scrapper.productShipping) {
//           productShipping = document.querySelector(scrapper.productShipping.linkRef);
//           productShipping = productShipping ? productShipping.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productShipping;
//         }
//         if (scrapper.productCategory) {
//           productCategory = document.querySelector(scrapper.productCategory);
//           productCategory = productCategory ? productCategory.textContent.trim().replace(/\t\n/g, '').replace(/\t/g, '').replace(/\+/g, '').replace(/\n/g, '') : productCategory;
//         }

//         productImages = [];
//         if (scrapper.productImage) {
//           productImageRaw = document.querySelectorAll(scrapper.productImage.linkRef);
//           console.log(productImageRaw, '54545456666------');

//           if (productImageRaw && productImageRaw.length && productImageRaw.length > 0) {

//             for (var i = 0; i < productImageRaw.length; i++) {
//               var imageToProcess = productImageRaw[i];
//               if (imageToProcess && imageToProcess.nodeName === "IMG") {
//                 imageToProcess = imageToProcess.src;
//                 productImages.push(imageToProcess);
//               }
//               else if (imageToProcess && imageToProcess.nodeType == 1) {
//                 let imgURL = imageToProcess.style.backgroundImage.slice(4, -1).replace(/"/g, "");
//                 var hostname = (new URL(url)).hostname;
//                 imageToProcess = `https://${hostname}${imgURL}`;
//                 productImages.push(imageToProcess);
//               }
//             }

//           }
//         }

//         return JSON.stringify({
//           productTitle: productTitle,
//           productDescription: productDescription,
//           productCurrentPrice: productCurrentPrice,
//           productRatting: productRatting,
//           productSlashedPrice: productSlashedPrice,
//           productShipping: productShipping,
//           storeUrl: scrapper.categoryUrl,
//           productCategory: productCategory,
//           productImage: productImages,
//           productLink: url
//         })
//       }, scrapper, url);

//     } catch (e) {
//       console.log(e, 'getProductsItems');
//     }

//     page.close();
//     if (productDetails) {
//       productDetails = JSON.parse(productDetails._remoteObject.value);
//       console.log(productDetails, 'productDetails 557766');
//       saveProductInDB(productDetails);
//     }
//     if (currentIndex + 1 < URLLen) {
//       currentIndex = currentIndex + 1;
//       const nextUrl = productLinks[currentIndex];
//       await getProductsItems(nextUrl, scrapper);
//     }
//     else {
//       // resolve();
//     }
//   }
//   var URLLen = productLinks.length;
//   var currentIndex = 0;
//   const firstUrl = URLLen > -1 ? productLinks[currentIndex] : '';
//   await getProductsItems(firstUrl, scrapper);
//   if (URLLen <= currentIndex + 1) {
//     // resolve();
//   }

//   // })
// }

// async function saveProductInDB(productDetails) {
//   // var product = new Product(productDetails);
//   try {
//     // const savedProduct = await product.save();
//     await Product.updateOne({ productLink: productDetails.productLink }, productDetails, { upsert: true });
//     // console.log(scrapperSavedOrUpdated, 'savedProductsavedProduct');
//   }
//   catch (err) {
//     console.log(err);
//   }
// }


// const extractCategoryPages = async (url, queryParam) => {
// Scrape the data we want
// const page = await browser.newPage();
// await page.goto(url);
// let productLinks = await page.evaluateHandle((queryParam, url) => {
//   console.log(queryParam, 'queryParam')
//   let elementsAnchorNotArr = document.querySelectorAll(queryParam);
//   let pagerLink = document.querySelector('a.link');
//   console.log(url.indexOf('page=') > -1, 'url.indexOf() > -1', url.indexOf('page='), url)
//   if (url.indexOf('page=') > -1) {
//     const urlSplit = url.split(/page=(\d+)$/);
//     const nextPageNumber = parseInt(urlSplit[1]) + 1;
//     const nextURL = `${urlSplit[0]}page=${nextPageNumber}`;
//     console.log(nextURL, 'nextURLnextURL');
//   }
//   else if (pagerLink) {
//     const urlSplit = pagerLink.href.split(/page=(\d+)$/);
//     const nextPageNumber = parseInt(urlSplit[1]) + 1;
//     const nextURL = `${urlSplit[0]}page=${nextPageNumber}`;
//     console.log(nextURL, 'nextURLnextURL');
//   }

//   // const nextUrl = `${url}?page=${nextPageNumber}`;

//   if (elementsAnchorNotArr) {
//     let elementAchor = [...elementsAnchorNotArr];
//     let links = elementAchor.map(a => a.href);
//     return JSON.stringify(links);
//   }
//   else {
//     return JSON.stringify([]);
//   }
// }, queryParam, url);
// // await page.close();
// // Recursively scrape the next page
// if (productLinks._remoteObject) {
//   productLinks = JSON.parse(productLinks._remoteObject.value);
// }
// else {
//   productLinks = JSON.parse(productLinks);
// }
// if (URLLen <= currentIndex + 1) {
//   // Terminate if no partners exist
//   return productLinks
// }
// else {
//   // Go fetch the next page ?page=X+1
//   currentIndex = currentIndex + 1;
//   const nextUrl = categoryUrls[currentIndex];
//   if (productLinks.length) {
//     return productLinks.concat(await extractCategoryPages(nextUrl, queryParam));
//   }
//   else {
//     return [].concat(await extractCategoryPages(nextUrl, queryParam));
//   }
//   // }
// };

// var URLLen = categoryUrls.length;
// var currentIndex = 0;
// const firstUrl = URLLen > -1 ? categoryUrls[currentIndex] : '';
// const productsLink = await extractCategoryPages(firstUrl, queryParam);
// console.log(productsLink, 'productsLinkproductsLink')
// }



module.exports = app;