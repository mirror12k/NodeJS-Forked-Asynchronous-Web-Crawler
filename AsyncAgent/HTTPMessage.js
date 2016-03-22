/**
 * AsyncAgent.HTTPMessage
 * represents a basic HTTP message with functionality for parsing, stringing, accessing, and setting headers
*/



/**
 * creates a new HTTPMessage object
 * all arguments optional
 * protocol can be a protocol string
 * headers can be an object defining header key-value pairs
 * header values can be a single string or an array of strings
 * body can be a string which will be used as the message body
*/
function HTTPMessage (protocol, headers, body) {
	var self = this;
	if (protocol !== undefined)
		self.protocol = protocol;
	else
		self.protocol = '';

	self.headers = {};
	if (headers !== undefined)
		Object.keys(headers).forEach(function (key) {
			if ('string' === typeof headers[key]) {
				self.headers[key] = [ headers[key] ];
			} else {
				self.headers[key] = headers[key].slice(0);
			}
		});

	if (body !== undefined)
		self.body = body;
	else
		self.body = '';
}

/**
 * parse a given string containing headers
*/
HTTPMessage.prototype.parseHeaders = function(headers) {
	var self = this;
	headers.split("\n").filter(function (s) { return s.trim() !== ''; }).forEach(function (s) {
		var key = s.split(':', 1)[0];
		var val;
		if (s.indexOf(':') !== -1)
			val = s.substring(key.length+1);
		else
			val = '';

		self.pushHeader(key.trim(), val.trim());
	});
};


/**
 * get a single (typically the first) header value for a given key
 * returns undefined if no such header exists
*/
HTTPMessage.prototype.getHeader = function(header) {
	var headers = this.headers[header.toLowerCase()];
	if (headers !== undefined) {
		return headers[0];
	} else {
		return undefined;
	}
};
/**
 * get an array of values for a given header key
 * returns undefined if the header doesn't exist
*/
HTTPMessage.prototype.getMultiHeader = function(header) {
	return this.headers[header.toLowerCase()];
};


/**
 * set the value of a header key, replacing any and all previous values
*/
HTTPMessage.prototype.setHeader = function(header, val) {
	if (val === undefined)
		delete this.headers[header.toLowerCase()];
	else
		this.headers[header.toLowerCase()] = [val];
};

/**
 * set the array of values for a given header key
*/
HTTPMessage.prototype.setMultiHeader = function(header, val) {
	this.headers[header.toLowerCase()] = val;
};

/**
 * push a value to the list of values of a header key
*/
HTTPMessage.prototype.pushHeader = function(header, val) {
	header = header.toLowerCase();
	if (this.headers[header] === undefined)
		this.headers[header] = [val];
	else
		this.headers[header].push(val);
};

/**
 * remove a header and all of its values if it exists
*/
HTTPMessage.prototype.deleteHeader = function(header) {
	delete this.headers[header];
};

/**
 * creates a copy of this message object
*/
HTTPMessage.prototype.clone = function() {
	return new HTTPMessage(this.protocol, this.headers, this.body);
};

/**
 * convert all headers to a proper header string
*/
HTTPMessage.prototype.stringHeaders = function() {
	var self = this;
	return Object.keys(self.headers).map(function (key) {
		return self.headers[key].map(function (val) { return key + ': ' + val; }).join("\r\n") + "\r\n";
	}).join('');
};

/**
 * abstract method for creating a stringified message status
*/
HTTPMessage.prototype.stringStatus = function () { throw "unimplemented"; };


/**
 * convert this message to a proper http message string
*/
HTTPMessage.prototype.toString = function() {
	return this.stringStatus() + "\r\n" + this.stringHeaders() + "\r\n" + this.body;
};



module.exports = HTTPMessage;
