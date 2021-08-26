const express = require("express");
const Category = require("./models/category-modal");
const ProductCategory = require("./models/product-category");
const app = express();
const bodyParser = require("body-parser");
const logger = require('morgan');
const puppeteer = require('puppeteer');
const axios = require('axios');
const ObjectId = require('mongoose').Types.ObjectId;
var cors = require('cors');

app.use(cors());

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb' }));

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.post("/api/v1/add-category", async (req, res) => {
  const {
    categoryName, subcategories
  } = req.body;
  const category = new Category({ categoryName, subcategories });

  try {
    const savedCategory = await category.save();
    res.json(savedCategory);
  }
  catch (err) {
    res.status(500).send(err);
  }

});
app.get("/api/v1/get-custom-categories/", async (req, res) => {
  try {
    fetchedCategory = await Category.find({});
    res.json(fetchedCategory);
  }
  catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
});

app.get("/api/v1/get-product-categories/", async (req, res) => {
  try {
    let fetchedProductCategory = await ProductCategory.find({});
    res.json(fetchedProductCategory);
  }
  catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
});



app.post("/api/v1/delete-custom-category/:id", async (req, res) => {
  // http://localhost:9000/api/v1/delete-product/5f5755ce9058f62c5478ceeavvv
  try {
    let deletedProduct = await Category.remove({ _id: new ObjectId(req.params.id) });
    res.json(deletedProduct);
  }
  catch (err) {
    res.status(500).send(err);
  }
});

app.post("/api/v1/edit-custom-category/", async (req, res) => {
  console.log('request received', req.body)
  await Category.updateOne({ _id: new ObjectId(req.body._id) }, req.body);
  let customCategoryFound = await Category.findOne({ _id: new ObjectId(req.body._id) });
  res.json(customCategoryFound);
});






module.exports = app;