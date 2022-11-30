require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const validUrl = require('valid-url');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// home page
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

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

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// get the shorturl for long/original url input
app.post('/api/shorturl', async (req, res) => {
  // get original url input
  const original = req.body.url;
  // validated input url
  if (!validUrl.isWebUri(original)) {
    res.json({ error: 'invalid URL'});
  } else {
    try {
      // check if url exists in the db
      let existingUrlEntry = await Url.findOne({original_url: original});
      // if url exists, return the result
      if (existingUrlEntry) {
        res.json({
          original_url: existingUrlEntry.original_url,
          short_url: existingUrlEntry.short_url
        })
      } else {
        // if url does not exist, create new document
        let numDocs = await Url.estimatedDocumentCount({});
        // if no documents exist, create a new one with shorturl = 1
        if (!numDocs) {
          await Url.create({
            original_url: original,
            short_url: 1,
          });
        } else {
          // if documents already exist
          // get the latest inserted document (by largest short url)
          let latestDoc = await Url.findOne({}).sort({ short_url: "desc" });
          // get latest shorturl
          let largestShortUrl = latestDoc.short_url;
          // create a new document with shorturl incremented
          await Url.create({
            original_url: original,
            short_url: largestShortUrl + 1,
          });
        }
        // return the (now) existing document
        let urlDoc = await Url.findOne({ original_url: original });
        res.json({
          original_url: urlDoc.original_url,
          short_url: urlDoc.short_url,
        });
      }
    } catch (err) {
      console.log(err)
    }
  }
})

app.get("/api/shorturl/:num", async (req, res) => {
  // validate shorturl (only allow numbers)
  if (isNaN(req.params.num)) {
    res.json({error: 'invalid short url'})
  } else {
    // find the doc
    let findUrlDoc = await Url.findOne({ short_url: req.params.num });
    // if no doc matches the url, return "not found"
    if (!findUrlDoc) {
      res.json({error: 'short url not found'})
    } else {
      // redirect to the original (long) url
      res.redirect(findUrlDoc.original_url);
      console.log(`shorturl ${req.params.num} redirected to: ${findUrlDoc.original_url}`);  
    }
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
