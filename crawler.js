
var cluster = require('cluster');

var AsyncCrawler = require('./AsyncCrawler');

if (cluster.isMaster) {
	var ua = new AsyncCrawler({ isMaster: true });
	console.log("done");
} else {
	var ua = new AsyncCrawler({ isMaster: false });
}

