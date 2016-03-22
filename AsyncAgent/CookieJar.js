/**
 * AsyncAgent.CookieJar class contains methods for storing and retrieving cookies for http communication
 */

var fs = require('fs');

function CookieJar (cookies) {
	this.cookies = cookies || {};
}

/**
 * get a dictionary of cookies for a given authority
 */
CookieJar.prototype.getCookies = function(authority) {
	if (this.cookies !== undefined)
		return this.cookies[authority];
};

/**
 * sets the cookies in the given dictionary for a given authority
 * cookies can override previous values
 */
CookieJar.prototype.setCookies = function(authority, cookies) {
	var self = this;
	if (self.cookies !== undefined) {
		// console.log("setting cookies: ", cookies);
		if (self.cookies[authority] === undefined)
			self.cookies[authority] = {};
		Object.keys(cookies).forEach(function (key) {
			self.cookies[authority][key] = cookies[key];
		});
	}
};

/**
 * writes the cookies from this cookie jar to the given file in JSON format
 * optional callback is called when writing complete
 */
CookieJar.prototype.toFile = function(filepath, callback) {
	fs.writeFile(filepath, JSON.stringify(this.cookies), function (error) {
		if (error) throw error;
		if (callback) callback();
	});
};

/**
 * reads the cookies from the given file in JSON format to this cookie jar
 * optional callback is called when reading is complete and all cookies are loaded
 */
CookieJar.prototype.fromFile = function(filepath, callback) {
	fs.readFile(filepath, function (error, data) {
		if (error) throw error;
		this.cookies = JSON.parse(data);
		if (callback) callback();
	});
	return this;
};

/**
 * synchronous variant of toFile
 */
CookieJar.prototype.toFileSync = function(filepath) {
	fs.writeFileSync(filepath, JSON.stringify(this.cookies));
};

/**
 * synchronous variant of fromFile
 */
CookieJar.prototype.fromFileSync = function(filepath) {
	var data = fs.readFileSync(filepath);
	this.cookies = JSON.parse(data);
	return this;
};

module.exports = CookieJar;
