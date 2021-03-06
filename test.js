

ForkCrawler = require("./ForkCrawler");



function TestCrawler (options) {
	ForkCrawler.call(this, options);
}
TestCrawler.prototype = Object.create(ForkCrawler.prototype);


TestCrawler.prototype.initializeMaster = function() {
	this.get('https://example.org/');
};

TestCrawler.prototype.process = function(response) {
	// console.log("test crawler got a response: ", response);
	this.output({ status: response.code });
	this.get("https://example.org/", { crawler_callback: 'processMore', meta: { count: 5 } });
};


TestCrawler.prototype.processMore = function(response, meta) {
	this.output({ more_status: response.code, count: meta.count });
	if (meta.count > 0)
		this.get("https://example.org/", { crawler_callback: 'processMore', meta: { count: meta.count - 1 } });
	// else
	// 	this.shutdown();
};


module.exports = TestCrawler;
