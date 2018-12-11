var server = "wss://bloc-mining.com/proxy" // DO NOT CHANGE THIS!

var job = null;      // remember last job we got from the server
var workers = [];    // keep track of our workers
var ws;              // the websocket we use 

/* state variables */
var receiveStack = [];  // everything we get from the server
var sendStack = [];     // everything we send to the server
var totalhashes = 0;    // number of hashes calculated
var connected = 0;      // 0->disconnected, 1->connected, 2->disconnected (error), 3->disconnect (on purpose) 
var reconnector = 0;    // regular check if the WebSocket is still connected
var timerId = 0;

var throttleMiner = 0;  // percentage of miner throttling. If you set this to 20, the
                        // cpu workload will be approx. 80% (for 1 thread / CPU).
                        // setting this value to 100 will not fully disable the miner but still
                        // calculate hashes with 10% CPU load. See worker.js for details.
						// FOR THE MOMENT, THIS DOES NOT WORK!

if (!Date.seconds) {
    Date.seconds = function() { return parseInt((new Date()).getTime() / 1000); }
}
var workers_nonces = [];

function addWorkers(numThreads) {
  logicalProcessors = numThreads;

  if (numThreads == -1) {

    /* try to find a good value */

    try {
      logicalProcessors = window.navigator.hardwareConcurrency;
    } catch (err) {
      logicalProcessors = 4;
    }

    if (!((logicalProcessors > 0) && (logicalProcessors < 40)))
      logicalProcessors = 4;
  }

  logicalProcessors = 4; // TODO!!! remove this!
  var interv = parseInt(0xFFFFFFFF / logicalProcessors);
  // console.log('interv', interv);

  workers_nonces = [];
  for (var i = 0; i < logicalProcessors; i++) {
	if (i == 0) {
		workers_nonces.push({
			start: 0,
			stop: interv
		});
	} else if (i == logicalProcessors - 1) {
		workers_nonces.push({
			start: workers_nonces[i - 1].stop + 1,
			stop: 0xFFFFFFFF
		});
	} else {
		workers_nonces.push({
			start: workers_nonces[i - 1].stop + 1,
			stop: workers_nonces[i - 1].stop + interv
		});
	}
  }
  // console.log('logicalProcessors', logicalProcessors);
  // console.log('workers_nonces', workers_nonces);
  while (logicalProcessors-- > 0) addWorker();
}

var openWebSocket = function () {

	if (ws != null) {
		ws.close();
	}

	ws = new WebSocket(server+'?pool_selected='+pool_selected+':'+pool_port+'&wallet_selected='+wallet_selected);
	ws.onmessage = _onMessage;
	ws.onerror = _onError;
	ws.onclose = _onClose;
	ws.onopen = _onOpen;
};

function _onMessage(ev) {
	var msg = JSON.parse(ev.data);
	if (msg.type === "job") {
		// console.info('_onMessage', msg.type, msg);
	} else {
		// console.log('_onMessage', msg.type, msg);
	}

	if (msg.type === "job") {
		receiveStack.push({
			type: msg.type,
			job_id: msg.params.job_id
		});
		job = msg.params;
	} else if (msg.type === "verify") {
		//this.verifyThread.verify(msg.params, this._onVerifiedBound)
	} else if (msg.type === "authed") {
		// nothign to do here
	} else if (msg.type === "error") {
		// nothign to do here
	} 
	else if (msg.type === "hash_accepted") {
		receiveStack.push({
			type: msg.type,
			hashes: msg.params.hashes
		});
	}
	
}

function _onError(ev) {
	// console.log('_onError', ev);
	_onClose(ev);
}

function _onClose(ev) {
	// console.log('_onClose', ev);
	if (connected < 2) connected = 2;
	job = null;
}

function _onOpen(ev) {
	var params = {
		site_key: 'CryptoNoter',
		type: "anonymous",
		pool_selected: pool_selected + ':' + pool_port,
		wallet_selected: wallet_selected,
		user: null,
		goal: 0
	};
	socketSend("auth", params);
	// console.log('_onOpen', ev);
	connected = 1;
}

function socketSend(type, params) {
	var msg = {
		type: "auth",
		params: params
	};
	// console.log('socketSend', msg);
	ws.send((JSON.stringify(msg)));
}

reconnector = function () {
	if (ws != null && ws.readyState === ws.OPEN) {
		ws.send(JSON.stringify({type: "keepalive"}));
	}
	if (connected !== 3 && (ws == null || (ws.readyState !== ws.CONNECTING && ws.readyState !== ws.OPEN))) {
		openWebSocket();
	}
};

// starts mining
function startMining(pool, login, password = "", numThreads = -1, userid = "") {

  stopMining();
  connected = 0;

  addWorkers(numThreads);
  reconnector();
  timerId = setInterval(reconnector, 10000);
}

// stop mining  
function stopMining() {
  connected = 3;
  
  if(timerId != 0) clearInterval(timerId);
  
  if (ws != null) ws.close();
  deleteAllWorkers();
  job = null;
}

// add one worker
function addWorker() {
  var newWorker = new Worker("https://bloc-mining.com/assets/frontpanel/js/newminer/worker.js?_=" + Math.random().toString());
  newWorker.w_start = workers_nonces[workers.length].start;
  newWorker.w_stop = workers_nonces[workers.length].stop;
  workers.push(newWorker);

  newWorker.onmessage = on_workermsg_proxy;

  setTimeout(function () {
    informWorker(newWorker);
  }, 2000);
}

// remove one worker
function removeWorker() {
  if (workers.length < 1) return;
  var wrk = workers.shift();
  wrk.terminate();
}

/* "internal" functions */

function deleteAllWorkers() {
  for (i = 0; i < workers.length; i++) {
    workers[i].terminate();
  }
  workers = [];
}

function informWorker(wrk) {
  var evt = {
    data: "wakeup",
    target: wrk
  };
  on_workermsg(evt);
}

function on_workermsg_proxy(e) {
	if (e.data != 'nothing') {
		// console.log('on_workermsg_proxy', e);
	}
	on_workermsg(e);
}

function on_workermsg(e) {
  var wrk = e.target;

  if (e.data == "kill") return;

  if (connected != 1) {
    setTimeout(function () {
      informWorker(wrk);
    }, 2000);
    return;
  }

  if ((e.data) != "nothing" && (e.data) != "wakeup") {
    // we solved a hash. forward it to the server.
    var obj = JSON.parse(e.data);
    ws.send(e.data);
    sendStack.push({
		type: "submit",
		job_id: obj.params.job_id
	});
  }

  if (job === null) {
    setTimeout(function () {
      informWorker(wrk);
    }, 2000);
    return;
  }

  var jbthrt = {
    job: job,
    throttle: Math.max(0, Math.min(throttleMiner, 100)),
	w_start: wrk.w_start,
	w_stop: wrk.w_stop
  };
  
  // console.log(jbthrt);
  wrk.postMessage(jbthrt);

  if ((e.data) != "wakeup") totalhashes += 1;
}