// # Thumb Extractor tests
var fs = require('fs');
var url = require('url');
var util = require('util');
var _ = require('underscore');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var htmlparser = require('htmlparser2');
var ThumbExtractor = require('..');

module.exports = {

    setUp: function (next) {
        next();
    },

    tearDown: function (next) {
        next();
    },

    "Play area": function (test) {

        var site_urls = [
            "http://www.theverge.com/",
            "http://www.joystiq.com/",
            "http://io9.com/",
            "http://questionablecontent.net",
            "http://boingboing.net",
            "http://blog.makezine.com"
        ];
        async.forEach(site_urls, function (site_url, fe_next) {
            async.waterfall([
                // 1. Grab the source to the page.
                function (wf_next) {
                    request(site_url, wf_next);
                },
                // 2. Try some autodiscovery and fetch the feed.
                function (req, body, wf_next) {
                    // TODO: Improvements - this is a sad substitute for
                    // http://www.aaronsw.com/2002/feedfinder/
                    var $ = cheerio.load(body);
                    var formats = [
                        'application/rss+xml',
                        'text/xml',
                        'application/atom+xml',
                        'application/x.atom+xml',
                        'application/x-atom+xml'
                    ];
                    for (var i=0,format; format=formats[i]; i++) {
                        var feed_url = $('link[rel="alternate"]' +
                                         '[type="'+format+'"]').attr('href');
                        if (feed_url) {
                            feed_url = feed_url.replace('feed://', 'http://');
                            feed_url = url.resolve(site_url, feed_url);
                            return request(feed_url, wf_next);
                        }
                    }
                    util.debug("NO FEED URL FOR " + site_url);
                    fe_next();
                },
                // 3. Parse the fetched feed, try finding thumbs for items.
                function (req, body, wf_next) {
                    var handler = new htmlparser.FeedHandler(function (err, feed) {
                        var items = feed.items.slice(0,10);
                        async.forEach(items, function (item, fe_next) {
                            var req_opts = { url: item.link };
                            request(req_opts, function (err, req, body) {
                                ThumbExtractor.find(site_url, body, function (err, thumb_url, kind) {
                                    item.thumb_link = thumb_url;
                                    fe_next();
                                });
                            });
                        }, function (err) {
                            feed.url = site_url;
                            wf_next(null, feed);
                        });
                    });
                    var parser = new htmlparser.Parser(handler, {
                        xmlMode: true
                    });
                    parser.parseComplete(body);
                }
            ], function (err, feed) {
                util.debug("----------------------------------------------------------------------");
                util.debug("SITE: " + feed.title + " (" + feed.url +")");
                util.debug("----------------------------------------------------------------------");
                var items = feed.items.slice(0,10);
                for (var i=0,item; item=items[i]; i++) {
                    util.debug("* " + item.title);
                    util.debug("\t\t" + item.link);
                    util.debug("\t\t" + item.thumb_link);
                }
                util.debug("======================================================================");
                fe_next();
            });
        }, function (err) {
            test.done();
        });

    },
    
    "Test case fixtures should all result in expected URLs": function (test) {
        var base_url = 'http://example.com/blog/post.html';

        var try_fixture = function (err, data, fn, fe_next) {
            if (err) { throw err; }
            var parts = (''+data).split('---');
            var expected_url = parts.shift().trim();
            var expected_kind = parts.shift().trim();
            var body = parts.shift().trim();
            var cb = function (err, result_url, result_kind) {
                test.equal(result_url, expected_url);
                test.equal(result_kind, expected_kind);
                fe_next();
            };
            ThumbExtractor.find(base_url, body, cb);
        };

        fs.readdir(__dirname + '/fixtures', function (err, files) {
            async.forEach(files, function (fn, fe_next) {
                if (fn.indexOf('case-') !== 0) { return fe_next(); }
                fs.readFile(__dirname + '/fixtures/' + fn, function (e, d) {
                    try_fixture(e, d, fn, fe_next);
                });
            }, function (err) {
                test.done();
            });
        });
    }

};
