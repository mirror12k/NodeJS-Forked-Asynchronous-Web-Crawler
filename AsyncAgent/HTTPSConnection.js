/**
 * a Connection class extending HTTPConection for connecting to servers via the HTTPS protocol
 */


var events = require('events');
var net = require('net');
var tls = require('tls');

var HTTPResponse = require('./HTTPResponse');
var HTTPConnection = require('./HTTPConnection');

/**
 * creates a new un-connected HTTPSConnection
 */
function HTTPSConnection (host, port) {
	HTTPConnection.call(this, host, port || 443);
}

HTTPSConnection.prototype = Object.create(HTTPConnection.prototype);

/**
 * connects the HTTPSConnection to the given host and port address
 * sends a piped request if one is ready as soon as it is connected
 * this method is called automatically if a request is queued and the socket is not connected
 */
HTTPSConnection.prototype.connect = function() {
	var self = this;

	// console.log('connecting tls to', self.host, self.port);
	self.sock = tls.connect({ host : self.host, port : self.port }, function () {
		self.performNextRequest();
	});
	self.isConnected = true;

	self.sock.pipe(this);
};

module.exports = HTTPSConnection;
