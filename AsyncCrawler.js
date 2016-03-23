
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

		this.initializeMaster();
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
};


AsyncCrawler.prototype.recieveWorkerMessage = function(msg) {
	if (msg.type === 'output') {
		this.produceOutput(msg.data);
	} else if (msg.type === 'worker_ready') {
		this.workerReady(msg.id);
	} else if (msg.type === 'schedule_request') {
		var request = this.processRequest(msg.request);
		if (request !== undefined)
			this.scheduleJob({ type: 'request', request: request });
	} else if (msg.type === 'shutdown') {
		this.shutdown();
	} else {
		console.log("uknown type of worker msg: ", msg.type);
	}
};

AsyncCrawler.prototype.produceOutput = function(output) {
	console.log(JSON.stringify(output));
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

AsyncCrawler.prototype.masterShutdown = function() {
	this.workers.forEach(function (worker) {
		worker.kill();
	});
	this.workers = [];
	this.jobQueue = [];
	this.workersAvailable = [];
};

// method for processing requests that can be overloaded by subclasses
// whatever request is returned, will be executed, or nothing if undefined is returned
AsyncCrawler.prototype.processRequest = function(request) {
	return request;	
};

// abstract method which subclasses can override to implement intial-setup functionality
AsyncCrawler.prototype.initializeMaster = function() {};





// worker methods

AsyncCrawler.prototype.workerSendMessage = function(obj) {
	process.send(obj);
};

AsyncCrawler.prototype.workerRecieveJob = function(job) {
	// console.log("debug worker got message: ", job);
	if (job.type === 'request') {
		var request = new AsyncAgent.HTTPRequest(
			job.request.method || 'GET',
			job.request.url,
			job.request.protocol || 'HTTP/1.1',
			job.request.headers,
			job.request.body
		);
		this.workerHookRequest(this.request(request, job.request.options), job.request.options);
	} else {
		console.log("unknown job type:", job.type);
	}
};


AsyncCrawler.prototype.workerHookRequest = function (emitter, options) {
	var self = this;
	emitter.on('response', function (response) {
		if (options.crawler_callback === undefined)
			self.process(response, options.meta);
		else
			self[options.crawler_callback](response, options.meta);
		self.workerSendMessage({ type: 'worker_ready', id: cluster.worker.id })
	});
};

AsyncCrawler.prototype.process = function(res, meta) {
	console.log('unprocessed response');
	this.workerSendMessage({ type: 'output', data: res.code});
};


AsyncCrawler.prototype.output = function(data) {
	this.workerSendMessage({ type: 'output', data: data });
};







// state-ambiguous functions

/**
 * similar to AsyncAgent.request, but instead of requesting, it schedules a job for a worker to perform
 * options - optional object with settings which will be passed to AsyncAgent.request
 * additional options:
 *    - crawler_callback - an optional string naming a method of the crawler object which will be called, defaults to the 'process' method
 *    - meta - an optional object which will be passed as the second argument to the crawler callback
 */
AsyncCrawler.prototype.scheduleRequest = function(request, options) {
	if (this.isMaster) {
		var request = {
			method: request.method,
			url: request.path.toString(),
			protocol: request.protocol,
			headers: request.headers,
			body: request.body,
			options: options,
		};
		request = this.processRequest(request);
		if (request !== undefined)
			this.scheduleJob({ type: 'request', request: request });
	} else {
		this.workerSendMessage({ type: 'schedule_request', request: {
			method: request.method,
			url: request.path.toString(),
			protocol: request.protocol,
			headers: request.headers,
			body: request.body,
			options: options,
		} });
	}
};

AsyncCrawler.prototype.head = function(url, options) {
	options = options || {};
	return this.scheduleRequest(new AsyncAgent.HTTPRequest('HEAD', url, 'HTTP/1.1', options.headers, options.body), options);
};

AsyncCrawler.prototype.get = function(url, options) {
	options = options || {};
	return this.scheduleRequest(new AsyncAgent.HTTPRequest('GET', url, 'HTTP/1.1', options.headers, options.body), options);
};

AsyncCrawler.prototype.post = function(url, options) {
	options = options || {};
	return this.scheduleRequest(new AsyncAgent.HTTPRequest('POST', url, 'HTTP/1.1', options.headers, options.body), options);
};


AsyncCrawler.prototype.shutdown = function() {
	if (this.isMaster) {
		this.masterShutdown();
	} else {
		this.workerSendMessage({ type: 'shutdown' });
	}
};



module.exports = AsyncCrawler;
