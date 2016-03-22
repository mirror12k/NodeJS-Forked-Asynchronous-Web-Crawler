/**
 * expiremental connection type which simply echos the request in the response's body
 * used only for testing, should be disabled at all times
 */

var events = require('events');

var HTTPResponse = require('./HTTPResponse');

function TestReflectConnection (host, port) {}
TestReflectConnection.prototype = Object.create(events.EventEmitter.prototype);


TestReflectConnection.prototype.request = function(req) {
	var emitter = new events.EventEmitter();
	setTimeout(function() {
		var res = new HTTPResponse('200', 'OK', 'HTTP/1.1', req.headers, req.toString());
		res.setHeader('content-length', res.body.length);
		emitter.emit('response', res);
	}, 0);
	return emitter;
};


module.exports = TestReflectConnection;
