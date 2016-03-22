/**
 * AsyncAgent.HTTPResponse
 * represents a basic HTTP request and provides some utility methods
*/

var URL = require('./URL');
var HTTPMessage = require('./HTTPMessage');

/**
 * HTTPResponse constructor
 * all arguments optional
*/
function HTTPResponse (code, message, protocol, headers, body) {
	HTTPMessage.call(this, protocol, headers, body);

	if (code !== undefined)
		this.code = code;
	else
		this.code = '';

	if (message !== undefined)
		this.message = message;
	else
		this.message = '';
}

HTTPResponse.prototype = Object.create(HTTPMessage.prototype);

/**
 * parses a given http response string and sets values according to the given text
 * returns itself
 */
HTTPResponse.prototype.parse = function(text) {
	var status = text.split("\r\n", 1)[0];
	text = text.substring(text.indexOf("\r\n"));

	var statusparts = status.split(" ", 2);
	this.protocol = statusparts[0];
	this.code = statusparts[1];
	this.message = status.substring(this.protocol.length + this.code.length + 2);

	headers = text.split("\r\n\r\n", 1)[0];
	this.parseHeaders(headers);
	text = text.substring(headers.length + 4);

	this.body = text;

	return this;
};

/**
 * creates and returns an identical clone of the object
 */
HTTPResponse.prototype.clone = function() {
	return new HTTPResponse(this.code, this.message, this.protocol, this.headers, this.body);
};

/**
 * creates the status line string
 */
HTTPResponse.prototype.stringStatus = function() {
	return this.protocol + " " + this.code + " " + this.message;
};

/**
 * returns a boolean indicating if the response has an informational status code
 */
HTTPResponse.prototype.isInformational = function() {
	var code = parseInt(this.code);
	return code >= 100 && code < 200;
};

/**
 * returns a boolean indicating if the response has a successful status code
 */
HTTPResponse.prototype.isSuccess = function() {
	var code = parseInt(this.code);
	return code >= 200 && code < 300;
};

/**
 * returns a boolean indicating if the response has a redirect status code
 */
HTTPResponse.prototype.isRedirect = function() {
	var code = parseInt(this.code);
	return code >= 300 && code < 400;
};

/**
 * returns a boolean indicating if the response has a user error status code
 */
HTTPResponse.prototype.isUserError = function() {
	var code = parseInt(this.code);
	return code >= 400 && code < 500;
};

/**
 * returns a boolean indicating if the response has a server error status code
 */
HTTPResponse.prototype.isServerError = function() {
	var code = parseInt(this.code);
	return code >= 500 && code < 600;
};

/**
 * returns a boolean indicating if the response has an error status code
 */
HTTPResponse.prototype.isError = function() {
	return this.isUserError() || this.isServerError();
};

module.exports = HTTPResponse;
