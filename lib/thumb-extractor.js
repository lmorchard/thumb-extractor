// # Thumb Extractor
// Handy for extracting thumbs from the web.
var util = require('util');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');

var REJECTED_URLS = [
    "http://graphics8.nytimes.com/images/common/icons/t_wb_75.gif"
];

function accept (url) {
    for (var i=0, reject_url; reject_url=REJECTED_URLS[i]; i++) {
        if (url == reject_url) { return false; }
    }
    return true;
}

function find (body, next) {
    var $ = cheerio.load(body);

    var meta, url;

    // Open Graph image
    meta = $('meta[property="og:image"]');
    if (meta.length) {
        url = meta.attr('content');
        if (accept(url)) return next(null, url, 'meta_og_image');
    }

    // Twitter thumbnail
    meta = $('meta[rel="twitter:image"]');
    if (meta.length) {
        url = meta.attr('content');
        if (accept(url)) return next(null, url, 'meta_twitter_image');
    }

    // Old-school Facebook thumbnail convention
    meta = $('link[rel="image_src"]');
    if (meta.length) {
        url = meta.attr('href');
        if (accept(url)) return next(null, url, 'meta_image_src');
    }

    // Try looking for the first image in a number of common containers
    var candidate_parents = [
        'article', '.content', '.entry', '.postContainer', 
        '#article .first .image', // NYT?
        '#main-content'
    ];
    var sel = candidate_parents
        .map(function (p) { return p + ' img'; })
        .join(', ');
    var article_imgs = $(sel);
    if (article_imgs.length) {
        url = article_imgs.first().attr('src');
        if (accept(url)) return next(null, url, 'article');
    }

    // Try looking for the largest image on the page.
    var imgs = $('img');
    var areas = [];
    for (var i=0,img; img=imgs[i]; i++) {
        img = $(img);
        var width = img.attr('width');
        var height = img.attr('height');
        if (!(width||height)) { continue; }
        areas.push([width * height, img]);
    }
    if (areas.length) {
        areas.sort(function (a,b) {
            var a1 = a[0], b1 = b[0];
            return (b1-a1);
        });
        url = areas[0][1].attr('src');
        if (accept(url)) return next(null, url, 'largest');
    }

    return next(null, null, 'notfound');
}

module.exports = {
    find: find
};
