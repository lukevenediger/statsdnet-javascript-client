/**
 * A client library for sending metrics to statsd.net (https://github.com/lukevenediger/statsd.net/)
 *
 * @constructor
 * @param {string} targetURL the statsd.net http endpoint url
 * @param {string} [rootNamespace=""] a namespace to prefix all outgoing metrics with
 * @param {Number} [pumpIntervalSeconds=10] the time to wait between sending metrics, -1 to disable the pump interval
 * @param {Boolean} [logInternalMetrics=true] switch to enable or disable internal client metrics
 * @param {Number} [maxBufferSize] maximum number of data points to hold in memory between flushes - null for no limit
 * @param {Function} [postFunction] function to post metrics to the stats service
 */
var StatsdnetClient = function (
    targetURL,
    rootNamespace,
    pumpIntervalSeconds,
    logInternalMetrics,
    maxBufferSize,
    postFunction) {

    var me = this;

    if (!targetURL || targetURL === '') {
        throw new Error('Must specify where metrics will be sent to. Parameter: targetURL.');
    }
    rootNamespace = rootNamespace || '';
    pumpIntervalSeconds = pumpIntervalSeconds || 10;
    postFunction = postFunction || postMetricsToServer;

    me._url = targetURL;
    me._rootNamespace = rootNamespace;
    me._postFunction = postFunction;
    me._pumpIntervalEnabled = pumpIntervalSeconds !== -1;
    me._pumpIntervalMS = pumpIntervalSeconds * 1000;
    me._maxBufferSize = maxBufferSize;
    me._logInternalMetrics = (logInternalMetrics || true);
    me._lastRequestLatency = 0;
    me._counts = {};
    me._timings = [];
    me._gauges = {};

    /**
     * Initialise the statsd.net client
     */
    var initialise = function () {
        if (me._pumpIntervalEnabled) {
            pump();
        }
    };

    /**
     * Sends out metrics every x seconds.
     * @returns promise to signal when the send is complete
     */
    var pump = function () {

        var continuePump = function () {
            if (me._pumpIntervalEnabled) {
                setTimeout(pump, me._pumpIntervalMS);
            }
        };

        var payload = buildPayload()
        if (payload.length === 0) {
            // Can't send an empty payload
            continuePump();
            var deferred = jQuery.Deferred();
            deferred.resolve();
            return deferred.promise();
        }

        if (me._logInternalMetrics && me._lastRequestLatency) {
            me.timing('jsclient.post', me._lastRequestLatency);
        }
        var requestStart = new Date().getTime();
        if (me._maxBufferSize && payload.length > me._maxBufferSize) {
            payload.splice(0, payload.length - me._maxBufferSize);
        }
        me._counts = {};
        me._timings = [];
        me._gauges = {};

        // Send the data on its way
        return me._postFunction(me._url, { metrics: payload.join(',') })
            .then(
                function success() {
                    me._lastRequestLatency = new Date().getTime() - requestStart;
                    continuePump();
                },
                function failure() {
                    // eat it
                }
            );
    };

    /**
     * Builds the payload from the counts, timings and gauges
     * @returns {Array<string>} a list of metrics
     */
    var buildPayload = function () {
        var payload = [];
        for (var name in me._counts) {
            payload.push(me._rootNamespace + '.' + name + ':' + me._counts[name] + '|c');
        }
        for (var index = 0; index < me._timings.length; index++) {
            payload.push(me._rootNamespace + '.' + me._timings[index][0] + ':' + me._timings[index][1] + '|ms');
        }
        for (var name in me._gauges) {
            payload.push(me._rootNamespace + '.' + name + ':' + me._gauges[name] + '|g');
        }
        return payload
    };

    /**
     * Posts a batch of metrics off to the statsd.net server
     * @param {String} url
     * @param {Object} payload
     * @returns {Promise}
     */
    var postMetricsToServer = function (url, payload) {
        return jQuery.post(url, payload);
    };

    /**
     * Log a latency in milliseconds
     * 
     * @param {string} name the name of this measurement
     * @param {Number} milliseconds the time in milliseconds
     */
    me.timing = function (name, milliseconds) {
        me._timings.push([name, milliseconds]);
    };

    /**
     * Log a count
     *
     * @param {string} name the name of this measurement
     * @param {Number} value the value
     */
    me.count = function (name, value) {
        value = value || 1;
        me._counts[name] = me._counts.hasOwnProperty(name) ? me._counts[name] + value : value;
    };

    /**
     * Log a gauge
     * 
     * @param {string} name the name of this measurement
     * @param {Number} value the value
     */
    me.gauge = function (name, value) {
        me._gauges[name] = value;
    };

    /**
     * Flush the pending metrics to the statsd.net endpoint
     * Use this when you want control over when metrics are sent to the server
     * @returns promise to signal when this is complete
     */
    me.flushMetrics = function () {
        return pump();
    };

    initialise();
};