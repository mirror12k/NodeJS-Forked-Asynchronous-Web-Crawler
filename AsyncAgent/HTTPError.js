/**
 * generic HTTP exception class for AsyncAgent
 */



function HTTPError (message) {
	this.name = "HTTPError";
	this.message = message;
}
HTTPError.prototype = Object.create(Error.prototype);

module.exports = HTTPError;
