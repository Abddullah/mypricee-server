const express = require("express");
const Product = require("./models/product-modal.js");
const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const ObjectId = require('mongoose').Types.ObjectId;
let browser;

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));




app.get("/api/v1/test-scrapper/", async (req, res) => {
  // let fetchedScrapper, categoryLinks;
  browser = await puppeteer.launch({ headless: false });

  try {
    categoryLinks = await makeCategoriesLink('https://www.virginmegastore.ae/en/', "a.nav__link--l1");
    categoryLinks = JSON.parse(categoryLinks);
    console.log(categoryLinks, 'categoryLinks');
    // let productLinks = await makeProductsLink(categoryLinks, "a.product-list__thumb");
    makeProductsLink(categoryLinks, "a.product-list__thumb");
    // console.log(productLinks, '**productsLinkproductsLink**')
    // res.json(productLinks);
    res.end();
  }
  catch (err) {
    res.status(500).send(err);
  }
})


async function makeCategoriesLink(url, queryParam) {
  return new Promise(async (resolve, reject) => {
    const page = await browser.newPage();
    const query = queryParam;
    await page.goto(url, { waitUntil: 'networkidle2' });
    const categoryLinks = await page.evaluateHandle((query) => {
      let elementAchor = [...document.querySelectorAll(query)]
      let links = elementAchor.map(a => a.href);
      return JSON.stringify(links);
    }, query);
    // await browser.close();
    page.close();
    resolve(categoryLinks._remoteObject.value)
  })
}


async function makeProductsLink(categoryUrls, queryParam) {
  // return new Promise(async (resolve, reject) => {
  const extractCategoryPages = async (url, queryParam) => {
    // Scrape the data we want
    const page = await browser.newPage();
    await page.goto(url);
    let nextPageUrl = await page.evaluateHandle(() => {
      let pagerLink = document.querySelector('a.link');
      console.log(pagerLink, 'pagerLinkpagerLink');
      return pagerLink ? JSON.stringify({ link: pagerLink.href }) : JSON.stringify({ link: '' })
    });
    await page.close();
    if (nextPageUrl) {
      nextPageUrl = JSON.parse(nextPageUrl._remoteObject.value);
      console.log(nextPageUrl, 'nextPageUrlnextPageUrl');
      await getProductsLinks(nextPageUrl.link, queryParam);
    }
    if (URLLen <= currentIndex + 1) {
      console.log(nextPageUrl, 'All links products scrapped.')
    }
    else {
      currentIndex = currentIndex + 1;
      const nextUrl = categoryUrls[currentIndex];
      await extractCategoryPages(nextUrl, queryParam);


    }
  };

  var URLLen = 3;
  var currentIndex = 0;
  const firstUrl = URLLen > -1 ? categoryUrls[currentIndex] : '';
  const productsLink = await extractCategoryPages(firstUrl, queryParam);
  //   resolve(productsLink);

  // });
}


async function getProductsLinks(nextPageUrl, queryParam) {
  console.log('inside another product link function', nextPageUrl);
  return new Promise(async (resolve, reject) => {
    if (nextPageUrl) {
      let url = nextPageUrl;
      const page = await browser.newPage();
      await page.goto(url);
      let productLinks = await page.evaluateHandle((queryParam) => {
        let elementsAnchorNotArr = document.querySelectorAll(queryParam);
        if (elementsAnchorNotArr) {
          let elementAchor = [...elementsAnchorNotArr];
          let links = elementAchor.map(a => a.href);
          return JSON.stringify(links);
        }
        else {
          return JSON.stringify([]);
        }
      }, queryParam);
      page.close();
      if (productLinks) {
        productLinks = JSON.parse(productLinks._remoteObject.value);
        console.log(productLinks, 'productLinks 565656');
        if (productLinks.length && productLinks.length > 0) {
          await getProducts(productLinks);
          await nextURLCall(nextPageUrl, queryParam);
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    }
    else { resolve(); }
  })
}


async function nextURLCall(nextPageUrl, queryParam) {
  const urlSplit = nextPageUrl.split(/page=(\d+)$/);
  const nextPageNumber = parseInt(urlSplit[1]) + 1;
  const nextURL = `${urlSplit[0]}page=${nextPageNumber}${urlSplit[2] ? urlSplit[2] : ''}`;
  console.log(nextURL, 'nextURLnextURL');
  getProductsLinks(nextURL, queryParam);
}


async function getProducts(productLinks) {
  return new Promise(async (resolve, reject) => {
    // console.log(productLinks, 'productLinksproductLinks*-*-*-*');

    const getProductsItems = async (url) => {
      console.log(url, 'productLinksproductLinks*-*-*-*123');
      const page = await browser.newPage();
      await page.goto(url);
      let productDetails = await page.evaluateHandle(() => {
        let productTitle = document.querySelector('div.title>h1.name');
        productTitle = productTitle ? productTitle.textContent : productTitle;
        let productDescription = document.querySelector('div.tab-details>p.longDesc');
        productDescription = productDescription ? productDescription.textContent : productDescription;
        let productCurrentPrice = document.querySelector('div.price__value>span.price__number');
        productCurrentPrice = productCurrentPrice ? productCurrentPrice.textContent : productCurrentPrice;
        let productRatting = document.querySelector('div.tf-rating');
        productRatting = productRatting ? productRatting.textContent : productRatting;
        return JSON.stringify({ productTitle, productDescription, productCurrentPrice, productRatting })
      });
      page.close();
      if (productDetails) {
        productDetails = JSON.parse(productDetails._remoteObject.value);
        console.log(productDetails, 'productDetails 557766');
        saveProductInDB(productDetails);
      }
      // if (partnersOnPage.length < 1) {
      //   // Terminate if no partners exist
      //   return '';
      // } else {
      if (currentIndex + 1 < URLLen) {
        currentIndex = currentIndex + 1;
        const nextUrl = productLinks[currentIndex];
        await getProductsItems(nextUrl);
      }
      // }
    }

    var URLLen = productLinks.length;
    var currentIndex = 0;
    const firstUrl = URLLen > -1 ? productLinks[currentIndex] : '';
    getProductsItems(firstUrl);
    if (URLLen <= currentIndex + 1) {
      resolve();
    }

  })
}

async function saveProductInDB(productDetails) {
  var product = new Product(productDetails);
  try {
    const savedProduct = await product.save();
    console.log(savedProduct);
  }
  catch (err) {
    console.log(err);
  }
}


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