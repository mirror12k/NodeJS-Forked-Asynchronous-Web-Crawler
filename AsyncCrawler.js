
var cluster = require('cluster');

var AsyncAgent = require('./AsyncAgent');

function AsyncCrawler (options) {
	options = options || {};
	AsyncAgent.call(this, options);

	if (options.isMaster) {
		this.isMaster = true;
		this.workers = [];
		this.worker_count = options.worker_count || 2;

		this.jobQueue = [];
		this.workersAvailable = [];

		this.startWorkers();
	} else {
		this.isMaster = false;
		process.on('message', this.workerRecieveJob.bind(this));
		this.workerSendMessage({ type: 'worker_ready', id: cluster.worker.id });
	}
}
AsyncCrawler.prototype = Object.create(AsyncAgent.prototype);



// master methods

AsyncCrawler.prototype.startWorkers = function() {
	for (var i = 0; i < this.worker_count; i++) {
		this.workers.push(cluster.fork());
	}
	for (var i = 0; i < this.worker_count; i++) {
		var worker = this.workers[i];
		worker.on('message', this.recieveWorkerMessage.bind(this));
	}
	this.scheduleJob({ type: 'request', request: { method: 'GET', url: 'https://www.yahoo.com/' } });
	this.scheduleJob({ type: 'request', request: { method: 'GET', url: 'https://www.yahoo.com/' } });
	this.scheduleJob({ type: 'request', request: { method: 'GET', url: 'https://www.yahoo.com/' } });
	this.scheduleJob({ type: 'request', request: { method: 'GET', url: 'https://www.yahoo.com/' } });
};


AsyncCrawler.prototype.recieveWorkerMessage = function(msg) {
	if (msg.type === 'output') {
		this.produceOutput(msg.data);
	} else if (msg.type === 'worker_ready') {
		this.workerReady(msg.id);
	} else if (msg.type === 'schedule_job') {
		this.scheduleJob(msg.job);
	} else {
		console.log("uknown type of worker msg: ", msg.type);
	}
};

AsyncCrawler.prototype.produceOutput = function(output) {
	console.log("output:", output);
};

AsyncCrawler.prototype.workerReady = function(workerId) {
	if (this.jobQueue.length > 0) // if we have a job ready, send it
		cluster.workers[workerId].send(this.jobQueue.shift());
	else // otherwise add it to the queue of available workers
		this.workersAvailable.push(cluster.workers[workerId]);
};


AsyncCrawler.prototype.scheduleJob = function(job) {
	if (this.workersAvailable.length > 0) // if we have a worker available, send the job immediately
		this.workersAvailable.shift().send(job);
	else // otherwise add it to the queue of waiting jobs
		this.jobQueue.push(job);
};





// worker methods

AsyncCrawler.prototype.workerSendMessage = function(obj) {
	process.send(obj);
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
		console.log("unknown job type:", job.type);
	}
};


AsyncCrawler.prototype.workerHookRequest = function (emitter) {
	var self = this;
	emitter.on('response', function (response) {
		self.processResponse(response);
		self.workerSendMessage({ type: 'worker_ready', id: cluster.worker.id })
	});
};

AsyncCrawler.prototype.processResponse = function(res) {
	console.log('unprocessed response');
	this.workerSendMessage({ type: 'output', data: res.code});
};




AsyncCrawler.prototype.output = function(data) {
	this.workerSendMessage({ type: 'output', data: data });
};

module.exports = AsyncCrawler;
