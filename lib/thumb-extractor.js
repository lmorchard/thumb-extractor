// # Thumb Extractor
//
// Handy for extracting thumbs from the web.

var url = require('url');
var util = require('util');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');

var REJECTED_URLS = [
    'http://graphics8.nytimes.com/images/common/icons/t_wb_75.gif'
];
var REJECTED_RES = [
    '.*doubleclick\.net.*',
    '.*indieclick\.com.*'
];

// ## accept
// Consider accepting a thumb URL. Match against reject list. Resolve relative
// URLs to absolute with respect to base URL.
function accept (base_url, thumb_url) {
    // Bail, if there's no URL.
    if (!thumb_url) { return null; }
    // Check rejected URLs
    for (var i=0, reject_url; reject_url=REJECTED_URLS[i]; i++) {
        if (thumb_url == reject_url) { return null; }
    }
    // Check rejected regexes
    for (var i=0, reject_re; reject_re=REJECTED_RES[i]; i++) {
        var r = new RegExp(reject_re);
        if (r.test(thumb_url)) { return null; }
    }
    // Resolve any relative URLs to the fetched base URL.
    thumb_url = url.resolve(base_url, thumb_url);
    return thumb_url;
}

// ## find
function find (base_url, body, next) {
    var $ = cheerio.load(body);
    var meta, thumb_url;

    // Open Graph image
    thumb_url = accept(base_url,
         $('meta[property="og:image"]').first().attr('content'));
    if (thumb_url) return next(null, thumb_url, 'meta_og_image');

    // Twitter thumbnail
    thumb_url = accept(base_url,
         $('meta[name="twitter:image"]').first().attr('value'));
    if (thumb_url) return next(null, thumb_url, 'link_twitter_image');

    // Old-school Facebook thumbnail convention
    thumb_url = accept(base_url,
         $('link[rel="image_src"]').first().attr('href'));
    if (thumb_url) return next(null, thumb_url, 'meta_image_src');

    // Try looking for the largest image in a number of common containers
    var containers = [
        'article', '.content', '.entry', '.postContainer', 
        '#article .first .image', // NYT?
        '#comic', '.comic',
        '#main-content',
        null // Last-ditch, try all images everywhere
    ];
    for (var i=0; i<containers.length; i++) {

        // Assemble the selector, gather images.
        var sel = containers[i];
        var imgs = $(sel ? sel + ' img' : 'img');
        if (!imgs.length) { continue; }

        // Assemble image areas, where available.
        var areas = [];
        for (var i=0,img; img=imgs[i]; i++) {
            img = $(img);
            // TODO: Use something to discover real dimensions?
            var width = img.attr('width') || 0;
            var height = img.attr('height') || 0;
            areas.push([width * height, img]);
        }

        // If we got any areas, sort them and use the largest.
        if (areas.length) {
            areas.sort(function (a,b) { return (b[0]-a[0]); });
            for (var i=0, area; area=areas[i]; i++) {
                thumb_url = accept(base_url, area[1].attr('src'));
                if (thumb_url) return next(null, thumb_url, 'largest');
            }
        }

    }

    return next(null, null, 'notfound');
}

module.exports = {
    find: find
};
