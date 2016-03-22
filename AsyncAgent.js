/**
 * Asynchronous UserAgent
 * allows easy asyncronous requesting of http resources
 */


var fs = require('fs');
var zlib = require('zlib');
var events = require('events');

/* TODO:
 * request/response history
 * implement charset parsing and translating
 * file parsing (title parsing, link listing, form listing, form submittion)
 */


/**
 * creates a new useragent
 * options is an optional object for
 * available options:
 * - cookies - optional object which enables cookies and will become the associated cookie storage for the object
 * - useragent - optional string which will be passed as the UserAgent header
 * - allowedProtocols - optional array of allowed protocols (defaults to ['http:', 'https:'])
 * - allowedCompression - optional array of allowed compression methods (defaults to ['gzip', 'deflate:'])
 */
function AsyncAgent (options) {
	options = options || {};

	if (options.cookies !== undefined) {
		if (options.cookies === true) {
			this.cookieStorage = new AsyncAgent.CookieJar();
		} else {
			this.cookieStorage = new AsyncAgent.CookieJar(options.cookies);
		}
	}
	if (options.cookieStorage !== undefined)
		this.cookieStorage = options.cookieStorage;
	
	this.useragent = options.useragent;


	this.allowedProtocols = options.allowedProtocols || [ 'http:', 'https:', ]; // 'test_reflect:',
	this.allowedCompression = options.allowedCompression || [ 'gzip', 'deflate', ];

	this.compressors = {
		'gzip': { compress: zlib.gzip, decompress: zlib.gunzip, streamDecompressor: zlib.createGunzip },
		'deflate': { compress: zlib.deflate, decompress: zlib.inflate, streamDecompressor: zlib.createInflate },
	};
	this.connectors = {
		'http:': AsyncAgent.HTTPConnection,
		'https:': AsyncAgent.HTTPSConnection,
		// 'test_reflect:': AsyncAgent.TestReflectConnection,
	};

	this.connectionsCache = {};
}

AsyncAgent.URL = require('./AsyncAgent/URL');
AsyncAgent.HTTPMessage = require('./AsyncAgent/HTTPMessage');
AsyncAgent.HTTPRequest = require('./AsyncAgent/HTTPRequest');
AsyncAgent.HTTPResponse = require('./AsyncAgent/HTTPResponse');
AsyncAgent.HTTPError = require('./AsyncAgent/HTTPError');
AsyncAgent.HTTPConnection = require('./AsyncAgent/HTTPConnection');
AsyncAgent.HTTPSConnection = require('./AsyncAgent/HTTPSConnection');
AsyncAgent.TestReflectConnection = require('./AsyncAgent/TestReflectConnection');
AsyncAgent.CookieJar = require('./AsyncAgent/CookieJar');

/**
 * performs a specific HTTPRequest object
 * creates a connection to the associated authority and requests a response from it
 * returns the event emitter created by the connection associated with the protocol
 * the emitter will emit the 'response' event when a response has arrived
 * options is an optional object with options
 * available options:
 * - nocookies - if defined, disables setting and getting cookies for this request
 * - callback - optional callback which will be called when the request is completed
 * - chunked - if defined, forces the body of the request to be returned in chunks instead
 *   of being accumulated in the response body. 'data' events will be emitted with the chunks
 *   and 'end' will be emitted when all chunks have been returned
 * - content_file - optional filepath. implies the 'chunked' option. any data returned by the
 *   connection will be written to a new file at the given filepath
 * - content_file_callback - optional callback which will be called after the content_file is
 *   done being written and successfully closed
 */
AsyncAgent.prototype.request = function (request, options) {
	var self = this;
	options = options || {};

	// content_file option forces chunked mode
	if (options.content_file)
		options.chunked = true;

	// prepare the request
	request = this.prepareRequest(request, options);

	// get the connection and request from it, and get the response emitter
	var res = this.getConnection(request.path.protocol, request.path.host, request.path.port).request(request, { chunked: options.chunked });
	var emitter = new events.EventEmitter();

	// set some hooks
	if (this.cookieStorage !== undefined && options.nocookies === undefined)
		res.once('response', this.setCookiesFromResponse.bind(this, request.path.protocol+'//'+request.path.host+':'+request.path.port));
	if (options.callback !== undefined)
		res.once('response', options.callback);

	// if the request is chunked, we need to get the header and set up decompression for the body if compressed
	if (options.chunked) {
		res.once('header', function (response) {
			var compression = response.getHeader('content-encoding');
			if (compression !== undefined && request.method !== 'HEAD') {
				if (self.compressors[compression] === undefined) // verify that the decompressor exists
					throw new AsyncAgent.HTTPError("error: no such compression method available: '"+compression+"'");
				// create the stream decompressor
				var streamDecompressor = self.compressors[compression].streamDecompressor();
				// pipe the output to the emitter
				streamDecompressor.on('data', emitter.emit.bind(emitter, 'data'));
				streamDecompressor.on('end', emitter.emit.bind(emitter, 'end'));
				// pipe the input from the request
				res.on('data', streamDecompressor.write.bind(streamDecompressor));
				res.once('response', function () { streamDecompressor.end(); });
			} else {
				// simply pass the chunks to the emitter
				res.on('data', emitter.emit.bind(emitter, 'data'));
				res.on('response', emitter.emit.bind(emitter, 'end'));
			}
		});
	}

	// if we have a content_file option, we must 
	if (options.content_file) {
		var handle = fs.createWriteStream(options.content_file);
		// hook on to the emitter to make sure we get any potentially translated data
		emitter.on('data', handle.write.bind(handle));
		emitter.once('end', handle.end.bind(handle));
		if (options.content_file_callback) // if there's a callback for the content_file, connect it
			handle.once('finish', options.content_file_callback);
	}
	
	// pipe any events
	res.on('error', emitter.emit.bind(emitter, 'error'));
	res.once('header', emitter.emit.bind(emitter, 'header'));
	res.once('response', this.parseResponse.bind(this, emitter, options, request));

	return emitter;
};

/**
 * prepares the request by ensuring that the path is valid, setting any cookies that are necessary,
 * encoding a body form if present, and setting default headers such as Host, Content-Length, Connection, and User-Agent
 */
AsyncAgent.prototype.prepareRequest = function(request, options) {
	var authority = request.path.protocol+'//'+request.path.host+':'+request.path.port;

	// verify that the path is valid
	if (request.path.host === undefined)
		throw new AsyncAgent.HTTPError("unable to request without a host in url '"+request.path+"'");
	if (request.path.protocol === undefined)
		throw new AsyncAgent.HTTPError("unable to request without a protocol in url '"+request.path+"'");
	if (this.allowedProtocols.indexOf(request.path.protocol) === -1)
		throw new AsyncAgent.HTTPError("protocol not allowed '"+request.path.protocol+"'");

	if (options.nocookies === undefined && this.cookieStorage !== undefined) {
		// set the cookies for this request
		var cookies = this.cookieStorage.getCookies(authority);
		if (cookies !== undefined && Object.keys(cookies).length > 0) {
			cookies = Object.keys(cookies).map(function (key) {
				return key+"="+cookies[key];
			}).join("; ");
			request.setHeader('cookie', cookies);
		}
	}

	// if the body is a form object, url encode and string it
	if ('string' !== typeof request.body) {
		request.body = Object.keys(request.body).map(function (key) {
			return AsyncAgent.URL.urlencode(key)+"="+AsyncAgent.URL.urlencode(request.body[key]);
		}).join("&");
		if (request.getHeader('content-type') === undefined)
			request.setHeader('content-type', 'application/x-www-form-urlencoded');
	}

	// set some default headers
	if (request.getHeader('host') === undefined)
		request.setHeader('host', request.path.host);
	if (request.getHeader('content-length') === undefined && request.body.length > 0)
		request.setHeader('content-length', request.body.length);
	if (request.getHeader('connection') === undefined)
		request.setHeader('connection', 'Keep-Alive');
	if (request.getHeader('user-agent') === undefined && this.useragent !== undefined)
		request.setHeader('user-agent', this.useragent);

	if (request.getHeader('accept-encoding') === undefined && this.allowedCompression.length > 0)
		request.setHeader('accept-encoding', this.allowedCompression.join(', '));

	return request;
};

AsyncAgent.prototype.parseResponse = function(emitter, options, request, response) {
	response.request = request;

	var compression = response.getHeader('content-encoding');
	if (compression !== undefined && ! options.chunked && request.method !== 'HEAD') {
		if (this.compressors[compression] === undefined) // verify that the decompressor exists
			throw new AsyncAgent.HTTPError("error: no such compression method available: '"+compression+"'");
		else
			this.compressors[compression].decompress(response.body, function (error, buffer) {
				if (error === undefined || error === null) {
					response.body = buffer;
					emitter.emit('response', response);
				} else {
					emitter.emit('error', error);
				}
			});
	} else {
		// response.body = response.body.toString();
		emitter.emit('response', response);
	}
};

/**
 * shortcut to calling AsyncAgent.request with a 'GET' method, the given url path, and protocol of 'HTTP/1.1'
 * options is an optional object with options
 * options.headers will be passed to the request as the headers
 * options.body will be passed to the request as the body
 * all other options are passed to AsyncAgent.request
 */
AsyncAgent.prototype.get = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('GET', url, 'HTTP/1.1', options.headers, options.body), options);
};

/**
 * same as AsyncAgent.get except with a method of 'HEAD'
 */
AsyncAgent.prototype.head = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('HEAD', url, 'HTTP/1.1', options.headers, options.body), options);
};

/**
 * same as AsyncAgent.get except with a method of 'POST'
 */
AsyncAgent.prototype.post = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('POST', url, 'HTTP/1.1', options.headers, options.body), options);
};

/**
 * internal method for getting or creating a connection to a given authority
 * connections are cached per-authority until they omit the 'end' event
 */
AsyncAgent.prototype.getConnection = function(protocol, host, port) {
	var self = this;
	var authority = protocol+'//'+host+':'+port;
	var connection;
	if (this.connectionsCache[authority] !== undefined) {
		connection = this.connectionsCache[authority];
	} else {
		connection = new this.connectors[protocol](host, port);
		connection.once('end', function () {
			// console.log('removed connection from cache:', authority);
			self.connectionsCache[authority] = undefined;
		});
		this.connectionsCache[authority] = connection;
	}
	return connection;
};

/**
 * extracts any 'Set-Cookie' headers in the given response, parses them, and passes the cookies to setCookies
 */
AsyncAgent.prototype.setCookiesFromResponse = function(authority, res) {
	var cookieHeaders = res.getMultiHeader('set-cookie');
	if (cookieHeaders !== undefined) {
		for (var i = 0; i < cookieHeaders.length; i++) {
			var cookies = {};
			cookieHeaders[i].split(';').forEach(function (cookie) {
				var key = cookie.split('=', 1)[0];
				var val = cookie.substring(key.length + 1);
				cookies[key.trim()] = val.trim();
			});
			this.cookieStorage.setCookies(authority, cookies);
		}
	}
};

module.exports = AsyncAgent;
