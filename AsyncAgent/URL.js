/**
 * AsyncAgent.URL
 * describes a basic url with functions to create new ones
*/


/**
 * creates a new url
 * text = string or URL object which will provide the url parts
 * base = string or URL object which will be used as the url base
*/
function URL (text, base) {
	if (text !== undefined) {
		if ('string' === typeof text)
			this.parse(text);
		else
			this.base(text);
	}
	if (base !== undefined)
		this.base(base);
}

/**
 * parses a text url and sets variables based on the parsed text
 * throws an exception if parsing failed
 * returns itself
*/
URL.prototype.parse = function (text) {

	var parsed = /^(?:([^?#/]*:)?\/\/([^:?#/]*)(:\d+)?)?(\/?[^#?]*)(?:\?([^#]*))?(?:#(.*))?$/.exec(text);
	if (parsed === null) {
		throw "invalid url passed: '"+text+"'";
	}

	this.protocol = parsed[1];
	this.host = parsed[2];
	this.port = parsed[3];
	this.path = parsed[4];
	this.query = parsed[5];
	this.fragment = parsed[6];

	return this;
};

/**
 * merges two urls using path as the inital url, and the other as the relative url being created from the initial
 */
URL.mergePath = function (path, other) {
	if (other[0] == '/')
		return other;

	var index = path.lastIndexOf('/');
	if (index === -1)
		return other;

	path = path.substring(0, index);

	var parts = path.split('/').concat(other.split('/'));
	for (var i = 0; i < parts.length; i++) {
		if (parts[i] === '..') {
			parts.splice(i - 1, 2);
			i -= 2;
		}
	}
	return parts.join('/');
}

/**
 * merges properties with another url by filling in anything missing with the other's parts
 * also merges url paths if they are relative
 * returns itself
*/
URL.prototype.base = function (other) {
	if ('string' === typeof other)
		other = new URL(other);

	if (this.protocol === undefined)
		this.protocol = other.protocol;
	if (this.host === undefined)
		this.host = other.host;
	if (this.port === undefined)
		this.port = other.port;

	if (this.path === undefined)
		this.path = other.path;
	else if (this.path !== undefined && other.path !== undefined)
		this.path = URL.mergePath(other.path, this.path);

	if (this.query === undefined)
		this.query = other.query;
	if (this.fragment === undefined)
		this.fragment = other.fragment;

	return this;
};

/**
 * returns a copy of this URL as a new object
*/
URL.prototype.clone = function() {
	return new URL(this);
};

URL.prototype.stringPath = function() {
	s = '';
	if (this.path !== undefined)
		s += this.path;
	if (this.query !== undefined)
		s += '?'+this.query;
	if (this.fragment !== undefined)
		s += '#'+this.fragment;
	return s;
};

/**
 * converts all url parts to a url string
*/
URL.prototype.toString = function() {
	var s = '';
	if (this.protocol !== undefined)
		s += this.protocol;
	if (this.host !== undefined)
		s += '//'+this.host;
	if (this.port !== undefined)
		s += this.port;
	s += this.stringPath();
	return s;
};


/**
 * performs url encoding, percent encoding anything besides alphanumeric and '-_.~'
 */
URL.urlencode = function (text) {
	return text.split('').map(function (c) {
		if (/[A-Za-z0-9\-_\.~]/.test(c)) {
			return c;
		} else {
			return '%' + c.charCodeAt(0).toString(16);
		}
	}).join('');
}


module.exports = URL;
