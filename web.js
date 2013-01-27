var http = require('http');
var url = require('url');
var util = require('util');
var express = require('express');
var ThumbExtractor = require(__dirname);

var app = express.createServer(express.logger());

app.use(express.static(__dirname + '/media'));

app.get('/thumb', function (request, response) {
    var parts = url.parse(request.url, true);
    var qs = parts.query;
    if (!qs.url) {
        response.writeHead(404, {});
        response.end();
    }
    try {
        ThumbExtractor.fetch(qs.url, function (err, thumb_url, kind) {
            if (thumb_url) {
                response.writeHead(301, {
                    'Location': thumb_url,
                    'X-Thumb-Kind': kind
                });
                response.end();
            } else {
                response.writeHead(404, {});
                response.end();
            }
        });
    } catch (e) {
        response.writeHead(500, {});
        response.end("ERROR: " + util.inspect(e));
    }
});

app.use(function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
