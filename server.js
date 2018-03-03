// Express is a framework that is used with Node.js to create a webserver:
// https://expressjs.com/
var express = require('express');
var app = express();

// This will create a static public directory in /public. Put any static files you want to be available on your site there. This is usually things like a style.css file.
app.use(express.static('public'));

// hbs is a view engine for Express that uses handlebars.js
// https://www.npmjs.com/package/hbs
// https://handlebarsjs.com/
// Header and other static html are in layout.hbs
// Each page is loaded with res.render("name-of-template") and will render
// in the {{{ body }}} section of layout.hbs.
const hbs = require("hbs");
app.set("view engine", "hbs");
app.set("views", "views");

// This example uses the 'google-spreadsheet' NPM package to access the sheet
// https://www.npmjs.com/package/google-spreadsheet
// Note: There are two NPM packages with similar names, 'google-spreadsheet' and 'google-spreadsheets'
var GoogleSpreadsheet = require('google-spreadsheet');
 

// * * * * * * * * * * * * * * * * * * * 
// SETTINGS:
// * * * * * * * * * * * * * * * * * * * 

// spreadsheet key is the long id in the sheets URL (after "/d/").
// https://docs.google.com/spreadsheets/d/1C7Ojs1i8duxWBmBYPtMTDVLRF7mu-WMTEjKi1-xCuE8/edit#gid=707399917
//                                        ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^  
const SPREADSHEET_KEY             = "1C7Ojs1i8duxWBmBYPtMTDVLRF7mu-WMTEjKi1-xCuE8";

const SITE_TITLE                  = "Google Sheet Website: Plants"

const DEFAULT_TAB                 = 0; // Could also use the name of a tab like "Trees", or null for no default and just links

const API_URL                     = "https://google-sheet-app-json.glitch.me/";

// This won't show up in the JSON API but there needs to be a value (even an empty string).
const FAVICON_URL                 = "https://cdn.glitch.com/627f5674-c2e5-4334-a3d6-31e28e3fbdde%2Ffile-cabinet-2-favicon.ico?1520045396371";

function getInfo() {
  var doc = new GoogleSpreadsheet(SPREADSHEET_KEY);
  return new Promise(function(resolve, reject) {
    doc.getInfo(function(err, sheetData) {
      if (err) {
        console.log(err);
        reject({error: err});
      } else {
        if (sheetData.worksheets) {
          for (var i in sheetData.worksheets) {
             sheetData.worksheets[i].apiURL = API_URL + sheetData.worksheets[i].title;
          }
        }
        resolve(sheetData);
      }
    });
  });
}

function getSheet(worksheet) {
  return new Promise(function(resolve, reject) { 
    worksheet.getRows({}, function(err, sheetData) {
      if (err) {
        reject(err);
      }
      resolve(sheetData); 
    });
  });
};

function findSheetIndex(title, info) {
  var index = -1;
  if (title != "") {
    for (var w in info.worksheets) {
      if (info.worksheets[w].title === title) {
        index = w;
        break;
      }
    }    
  } else {
    return -1;
  }
  return index; 
}

var templateData = {
  favicon: FAVICON_URL,
  title: SITE_TITLE
}


app.get("/", function(req, res, next) {
  res.locals.tab = DEFAULT_TAB;
  next();
});

app.get("/:tab", function(req, res, next) {
  res.locals.tab = req.params.tab;
  next();
});

app.use(function(req, res, next) {
  var data;
  var index = -1;
  var title = "";
  getInfo()
  .then(function(info) {
    data = info;
    var tab = res.locals.tab;
    if (tab === null) {
      return {}; 
    }
    
    if (typeof tab === "string") {
      title = tab;
    } else {
      index = tab;
    }

    if (index < 0) {
      index = findSheetIndex(title, info);
    }
    if (index < 0) {
      throw({error: "Worksheet not found"});
    }
    return getSheet(info.worksheets[index]);
  })
  .then(function(newData) {
    if (index > -1) {
      data.worksheets[index].current = true;
      data.currentWorksheet = data.worksheets[index].title;
      data.rows = newData;
    }
    templateData.data = data;
    res.render("index", templateData);
    return;
  })
  .catch(function(err) {
    console.log("ERROR: " + err);
    res.locals.error = err.error;
    next();
  });
});

app.use(function(req, res, next) {
  templateData.error = res.locals.error;
  res.render("error", templateData);
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});