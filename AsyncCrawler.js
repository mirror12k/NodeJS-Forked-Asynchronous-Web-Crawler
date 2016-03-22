
var cluster = require('cluster');

var AsyncAgent = require('./AsyncAgent');

function AsyncCrawler (options) {
	options = options || {};
	AsyncAgent.call(this, options);

	if (options.isMaster) {
		this.isMaster = true;
		this.workers = [];
		this.worker_count = options.worker_count || 8;
		for (var i = 0; i < this.worker_count; i++) {
			this.workers.push(cluster.fork());
		}
		for (var i = 0; i < this.worker_count; i++) {
			var worker = this.workers[i];
			worker.on('message', this.recieveWorkerMessage.bind(this));
			worker.send({ type: 'request', request: { method: 'HEAD', url: 'http://example.org/' } });
			// worker.send({ msg: "hello worker #"+i });
		}
	} else {
		this.isMaster = false;
		process.on('message', this.workerRecieveJob.bind(this));
	}
}
AsyncCrawler.prototype = Object.create(AsyncAgent.prototype);


AsyncCrawler.prototype.recieveWorkerMessage = function(msg) {
	this.produceOutput(msg);
};

AsyncCrawler.prototype.produceOutput = function(output) {
	console.log("output:", output);
};

AsyncCrawler.prototype.workerProduceOutput = function(obj) {
	process.send(obj);
};

AsyncCrawler.prototype.workerHookRequest = function (emitter) {
	emitter.on('response', this.processResponse.bind(this));
};

AsyncCrawler.prototype.workerRecieveJob = function(job) {
	console.log("worker got message: ", job);
	if (job.type === 'request') {
		var request = new AsyncAgent.HTTPRequest(
			job.request.method || 'GET',
			job.request.url,
			job.request.protocol || 'HTTP/1.1',
			job.request.headers,
			job.request.body
		);
		this.workerHookRequest(this.request(request, job.options));
	} else {
		console.log("unknown job type: ", job.type);
	}
};


AsyncCrawler.prototype.processResponse = function(res) {
	console.log('unprocessed response');
	this.workerProduceOutput(res.code);
};


module.exports = AsyncCrawler;
