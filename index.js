require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dnsResolver = require("dns").promises;
// const promisify = require("util").promisify;

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

// connect to mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// create schema
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: Number,
});

// create model
const Url = mongoose.model("Url", urlSchema);

// home view
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});
const VALID_ADDRESS_PROTOCALL = /^(http:\/\/|https:\/\/)(www.)?\w/i;
const REMOVE_PROTOCALL = /^(https|http)?:\/\//i;

const isValidUrl = async (url) => {
  isValidSyntax = VALID_ADDRESS_PROTOCALL.test(url);
  if (!isValidSyntax) return false;

  try {
    let urlAddress = await dnsResolver.resolve(
      url.replace(REMOVE_PROTOCALL, "")
    );
    return !!urlAddress;
  } catch {
    return false;
  }
  return false;
};

const insertNewUrlDoc = (long, short) => {
  Url.create({
    original_url: long,
    short_url: short,
  });
};

const getUrl = async (url) => {
  let existingUrl = await Url.findOne({ original_url: url });
  return existingUrl;
};

// url shortener
app.post("/api/shorturl", async (req, res) => {
  // get original url
  const original = req.body.url;
  let valid = await isValidUrl(original);
  // if original url is not valid
  if (!valid) {
    res.json({ error: "invalid url" });
  } else {
    // check if url exists
    let existingUrl = await getUrl(original);
    // if exists
    if (existingUrl) {
      // return existing url with shorturl
      res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    } else {
      // insert new entry into db
      // determine number of documents in collection
      let numDocs = await Url.estimatedDocumentCount({});
      // if no entries yet in the db
      if (!numDocs) {
        // insert original with shorturl=1
        await Url.create({
          original_url: original,
          short_url: 1,
        });
      } else {
        // get largest shorturl and increment
        // insert original url with short url (incremented)
        let latestDoc = await Url.findOne({}).sort({ short_url: "desc" });
        let largestShortUrl = latestDoc.short_url;
        await Url.create({
          original_url: original,
          short_url: largestShortUrl + 1,
        });
      }
      let newExistingUrl = await Url.findOne({ original_url: original });
      res.json({
        original_url: newExistingUrl.original_url,
        short_url: newExistingUrl.short_url,
      });
    }
  }
  // res.redirect("/");
});

app.get("/api/shorturl/:num", async (req, res) => {
  // get address to redirect to (from shorturl)
  let redirect = await Url.findOne({ short_url: req.params.num });
  // remove protocol to allow for redirection
  let redirectFormatted = redirect.original_url.replace(REMOVE_PROTOCALL, "");
  // redirect
  res.redirect(`//${redirectFormatted}`);
  console.log(`shorturl ${req.params.num} redirected to: ${redirectFormatted}`);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
