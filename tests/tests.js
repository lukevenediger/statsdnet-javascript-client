/// <reference path="../statsdnet.js" />
/// <reference path="../bower_components/qunit/qunit/qunit.js" />
var lastPost = null;

/**
 * Pretends to submit data to the server
 * and saves the last request.
 */
var postData = function (url, payload) {
    var deferred = jQuery.Deferred();
    setTimeout(function () {
        deferred.resolve();
    });
    lastPost = { url: url, payload: payload };
    return deferred.promise();
}

test('Log a count', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.count('foo');
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, "test.foo:1|c");
    })
});

test('Log two counts of the same name', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.count('foo');
    client.count('foo');
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, "test.foo:2|c");
    })
});

test('Log two counts of different names', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.count('foo');
    client.count('bar');
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, "test.foo:1|c,test.bar:1|c");
    })
});

test('Log a gauge', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.gauge('foo', 100);
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, 'test.foo:100|g');
    });
});

test('Log the same gauge twice', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.gauge('foo', 100);
    client.gauge('foo', 200);
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, 'test.foo:200|g');
    });
});

test('Log a timing', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.timing('foo', 100);
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, 'test.foo:100|ms');
    });
});


test('Log two timings', function () {
    var client = new StatsdnetClient('http://foo.com/', 'test', -1, true, null, postData);
    client.timing('foo', 100);
    client.timing('foo', 100);
    stop();
    client.flushMetrics().then(function success() {
        start();
        var post = lastPost;
        equal(post.payload.metrics, 'test.foo:100|ms,test.foo:100|ms');
    });
});