

AsyncCrawler = require("./AsyncCrawler");



function TestCrawler (options) {
	AsyncCrawler.call(this, options);
}
TestCrawler.prototype = Object.create(AsyncCrawler.prototype);


TestCrawler.prototype.initializeMaster = function() {
	this.get('https://example.org/');
};

TestCrawler.prototype.process = function(response) {
	// console.log("test crawler got a response: ", response);
	this.output({ status: response.code });
	setTimeout(this.get.bind(this, "https://example.org/"), 1000);
};

// var ua = new AsyncCrawler();


module.exports = TestCrawler;
