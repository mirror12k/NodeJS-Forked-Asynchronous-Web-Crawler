
var cluster = require('cluster');

var AsyncCrawler = require('./AsyncCrawler');

if (cluster.isMaster) {
	var ua = new AsyncCrawler({ isMaster: true });
} else {
	var ua = new AsyncCrawler({ isMaster: false });
}

