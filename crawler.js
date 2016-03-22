
var cluster = require('cluster');

var AsyncCrawler = require('./AsyncCrawler');


if (process.argv.length < 3) {
	console.log("usage:", process.argv.join(' '), '<crawler class>');
} else {
	var crawlerClass = require(process.argv[2]);

	if (cluster.isMaster) {
		var ua = new crawlerClass({ isMaster: true });
	} else {
		var ua = new crawlerClass({ isMaster: false });
	}
}

