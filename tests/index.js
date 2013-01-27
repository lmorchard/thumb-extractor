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

var MAX_ITEMS = 20;

module.exports = {

    setUp: function (next) {
        next();
    },

    tearDown: function (next) {
        next();
    },

    "Play area": function (test) {
        //return test.done();

        var out = fs.createWriteStream('out.html');

        out.write('<html>');
        out.write('<head>');
        out.write('<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">');
        out.write('<link rel="stylesheet" type="text/css" href="out.css">');
        out.write('</head>');
        out.write('<body><ul class="feeds">');

        var site_urls = [
            "http://www.theverge.com/",
            "http://www.joystiq.com/",
            "http://www.polygon.com/",
            "http://io9.com/",
            "http://questionablecontent.net",
            "http://blog.makezine.com",

            "feed://feeds.boingboing.net/boingboing/iBag",
            "feed://feeds.feedburner.com/oatmealfeed",
            "feed://www.achewood.com/rss.php",
            "feed://fuckyeahdementia.tumblr.com/rss",
            "feed://jayisgames.com/index.rdf",
            "feed://feeds.feedburner.com/LightspeedMagazine",
            "feed://lookatthisfrakkinggeekster.tumblr.com/rss",
            "feed://www.penny-arcade.com/rss.xml",
            "feed://www.smbc-comics.com/rss.php",
            "feed://www.nerdist.com/feed/",
            "feed://www.theonion.com/content/feeds/daily",
            "feed://www.wired.com/underwire/feed/",
            "feed://www.vgcats.com/vgcats.rdf.xml",
            "feed://feeds.feedburner.com/VirtualShackles",
            "feed://weeklyworldnews.com/rss",
            "feed://feeds.wired.com/wired/culture/lifestyle",
            "feed://www.xkcd.com/rss.xml",
            "feed://mozillamemes.tumblr.com/rss",
            "feed://feeds.penny-arcade.com/pa-report?format=xml",
            "feed://www.polygon.com/rss/index.xml",
            "feed://arcadeheaven.wordpress.com/feed/",
            "feed://cheapassgamer.com/index.rdf",
            "feed://www.gamegirladvance.com/index.rdf",
            "feed://www.gamerswithjobs.com/index.php?q=node/feed/",
            "feed://www.joystiq.com/rss.xml",
            "feed://feeds.feedburner.com/Massively",
            "feed://feeds.feedburner.com/RetrogamingWithRacketboy",
            "feed://feeds.feedburner.com/RockPaperShotgun",
            "feed://www.jesperjuul.net/ludologist/?feed=rss2",
            "feed://www.wowinsider.com/rss.xml",
            "feed://feeds.feedburner.com/TinyCartridge",
            "feed://feeds.feedburner.com/boingboing/iBag",
            "feed://feeds.laughingsquid.com/laughingsquid",
            "feed://xml.metafilter.com/rss.xml",
            "feed://www.readwriteweb.com/rss.xml",
            "feed://www.slate.com/rss/",
            "feed://www.wired.com/news/feeds/rss2/0,2610,,00.xml",
        ];
        async.forEach(site_urls, function (site_url, fe_next) {
            async.waterfall([
                // 1. Grab the source to the page.
                function (wf_next) {
                    if (0 == site_url.indexOf('feed://')) {
                        // 2a. This is a feed URL, use it directly
                        var feed_url = site_url.replace('feed://', 'http://');
                        request(feed_url, wf_next);
                    } else {
                        // 2b. Try some autodiscovery and fetch the feed.
                        request(site_url, function (err, req, body) {
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
                        });
                    }
                },
                // 3. Parse the fetched feed, try finding thumbs for items.
                function (req, body, wf_next) {
                    util.debug('FEED ' + site_url);
                    var handler = new htmlparser.FeedHandler(function (err, feed) {
                        if (!feed.items) { wf_next(null, null); }
                        feed.url = site_url;

                        /*
                        wf_next(null, feed);
                        */
                        var items = feed.items.slice(0, MAX_ITEMS);
                        async.forEach(items, function (item, fe_next) {
                            ThumbExtractor.fetch(item.link, function (err, thumb_url, kind) {
                                item.thumb_link = thumb_url;
                                fe_next();
                            });
                        }, function (err) {
                            wf_next(null, feed);
                        });

                    });
                    var parser = new htmlparser.Parser(handler, {
                        xmlMode: true
                    });
                    parser.parseComplete(body);
                }
            ], function (err, feed) {
                if (!feed) { fe_next(); }
                out.write('<li class="feed"><h2><a href="' + site_url + '">' + feed.title + '</a></h2><ul class="items">');

                util.debug("----------------------------------------------------------------------");
                util.debug("SITE: " + feed.title + " (" + feed.url +")");
                util.debug("----------------------------------------------------------------------");
                var items = feed.items.slice(0, MAX_ITEMS);
                for (var i=0,item; item=items[i]; i++) {
                    
                    out.write('<li class="item">');
                    out.write('<a href="' + item.link + '">');
                    // out.write('<img src="' + item.thumb_link + '" alt="' + item.title + '">');
                    out.write('<img src="http://127.0.0.1:8765/thumb?url=' + item.link+ '" alt="' + item.title + '">');
                    // out.write('<img src="http://limitless-bastion-5261.herokuapp.com/thumb?url=' + item.link+ '" alt="' + item.title + '">');
                    out.write('<span>' + item.title + '</span>');
                    out.write('</a>');
                    out.write('</li>');

                    util.debug("* " + item.title);
                    util.debug("\t\t" + item.link);
                }
                util.debug("======================================================================");
                
                out.write('</ul></li>');

                fe_next();
            });
        }, function (err) {
            out.write('</ul></body></html>');
            out.end();
            test.done();
        });

    },
    
    "Test case fixtures should all result in expected URLs": function (test) {
        var base_url = 'http://example.com/blog/';

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
            ThumbExtractor.find(base_url + fn, body, cb);
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
