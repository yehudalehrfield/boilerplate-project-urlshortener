require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dns = require("dns");

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

// url shortener
app.post("/api/shorturl", (req, res) => {
  let original = req.body.url;

  const REMOVE_PROTOCALL = /^https?:\/\//i;
  const original_mod = original.replace(REMOVE_PROTOCALL, "");

  dns.lookup(original_mod, (err, validAddress) => {
    // if (err) console.log('Error:' + err);
    if (err) {
      console.log("Invalid url");
      res.json({error:"invalid url"})
    }
    else {
      console.log(validAddress)
      // check if the url is already in the database
      Url.findOne({ original_url: original }, (err, existingUrl) => {
        if (err) console.log(err);
        // if in the db, return the doc
        if (existingUrl) {
          res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url,
          });
        } else {
          // url not in the db
          // check if there are any documents
          Url.estimatedDocumentCount((err, docCount) => {
            if (err) console.log(err);
            // if there are no documents
            if (docCount == 0) {
              //create one with short_url = 1
              Url.create({
                original_url: original,
                short_url: 1,
              });
            } else {
              // documents exists
              // get largest shorturl and create a new document with a shorturl (incremented)
              Url.findOne({})
                .sort({ short_url: "desc" })
                .exec((err, lastDoc) => {
                  if (err) console.log(err);
                  const shortUrl = lastDoc.short_url + 1;
                  // add new document and return the json
                  Url.findOneAndUpdate(
                    { original_url: original },
                    { short_url: shortUrl },
                    { returnDocument: "after", upsert: true },
                    (err, doc) => {
                      if (err) console.log(err);
                      res.json({
                        original_url: doc.original_url,
                        short_url: doc.short_url,
                      });
                    }
                  );
                });
            }
          });
        }
      });
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
