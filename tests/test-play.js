var fs = require('fs');
var util = require('util');
var async = require('async');
var request = require('request');
var ThumbExtractor = require('..');

module.exports = {

    setUp: function (next) {
        next();
    },

    tearDown: function (next) {
        next();
    },
    
    "Test case fixtures should all result in expected URLs": function (test) {
        var try_fixture = function (err, data, fn, fe_next) {
            if (err) { throw err; }
            var parts = (''+data).split('---');
            var expected_url = parts.shift().trim();
            var expected_kind = parts.shift().trim();
            var body = parts.shift().trim();
            ThumbExtractor.find(body, function (err, result_url, result_kind) {
                test.equal(result_url, expected_url);
                test.equal(result_kind, expected_kind);
                fe_next();
            });
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
