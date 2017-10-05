/* eslint no-console: 0 */

const colorize = require('json-colorizer');
const obj_path = require('object-path');

function json_out(data) {
	data = JSON.stringify(data, null, 2);
	console.log(colorize(data));
}

function on_config_tx(data) {
	json_out(data);
}

function on_status_tx(data) {
	let status_obj = {};
	status_obj[data.key.stub] = data.value.full;

	let status_value = obj_path.get(status_obj, data.key.full);
	update.status(data.key.full, status_value);

	switch (data.key.stub) {
		case 'engine'      : break;
		case 'lcm'         : break;
		case 'temperature' : break;
		case 'system'      : break;

		// default : {
		// 	console.log('UNKNOWN KEY %s : %s', data.key.full, status_value);
		// 	json_out(status_obj);
		// }
	}
}

// Send data over WebSocket
function send(event, data) {
	// Don't bother sending anything if we're not connected
	if (status.server.connected === false) {
		log.msg({
			msg : 'Server not connected, cannot send message',
		});

		return;
	}

	// log.socket({
	// 	method : 'tx',
	// 	type   : status.system.type,
	// 	event  : event,
	// 	string : '',
	// });

	if (typeof socket.io !== 'undefined' && socket.io !== null) {
		if (typeof socket.io.emit === 'function') {
			let message = {
				host  : status.system,
				event : event,
				data  : data,
			};

			socket.io.emit('client-tx', message);
		}
	}
}

// Initialize WebSocket client
function init(init_cb = null) {
	if (status.server.connected === true) {
		log.msg({
			msg : 'Client already connected',
		});

		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return;
	}

	status.server.connected    = false;
	status.server.connecting   = true;
	status.server.reconnecting = false;

	msg_log('Connecting to ' + config.server.host + ':' + config.server.port);

	let url = 'http://' + config.server.host + ':' + config.server.port;

	socket.manager = require('socket.io-client').Manager(url, socket.options);
	socket.io      = socket.manager.socket('/');

	// Receive config and status data
	socket.io.on('config-tx', (data) => { on_config_tx(data); });
	socket.io.on('status-tx', (data) => { on_status_tx(data); });

	socket.io.on('connect', () => {
		msg_log('Connected to ' + config.server.host + ':' + config.server.port);

		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Send this host's data to WebSocket clients to update them
		// host_data.send();

		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
	});

	socket.io.on('connect_error', (error) => {
		status.server.connected = false;
		if (status.server.reconnecting === false) {
			msg_log('Connect error: ' + error.description.code);
		}
	});

	socket.io.on('connect_timeout', () => {
		status.server.connected = false;
		msg_log('Connect timeout');
	});

	socket.io.on('reconnect', (number) => {
		status.server.connected  = true;
		status.server.connecting = false;

		msg_log('Reconnected after ' + number + ' tries');
	});

	socket.io.on('reconnect_attempt', () => {
		status.server.connected    = false;
		status.server.connecting   = true;

		if (status.server.reconnecting === false) {
			status.server.reconnecting = true;
			log.msg({
				msg : 'Attempting to reconnect',
			});
		}
	});

	socket.io.on('reconnecting', (number) => {
		status.server.connected    = false;
		status.server.connecting   = true;
		status.server.reconnecting = true;

		log.msg({
			msg : 'Attempting to reconnect, try #' + number,
		});
	});

	socket.io.on('reconnect_error', (error) => {
		status.server.connected = false;
		msg_log('Reconnect error: ' + error.description.code);
	});

	socket.io.on('reconnect_failed', () => {
		status.server.connected    = false;
		status.server.connecting   = false;
		status.server.reconnecting = false;
		msg_log('Reconnect failed');
	});

	socket.io.on('pong', (number) => {
		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Only display message if the value changed
		if (status.server.latency !== number) {
			// Only display message if the value is greater than 10, or was previously greater than 10
			if (number > 10 || status.server.latency > 10) {
				log.msg({
					msg : 'Latency ' + number + 'ms',
				});
			}

			status.server.latency = number;
		}
	});

	socket.io.on('ping', () => {
		// log.msg({
		// 	msg : 'Pinged server',
		// });
	});

	socket.io.on('disconnect', () => {
		status.server.connected = false;
		msg_log('Disconnected from ' + config.server.host + ':' + config.server.port);
	});

	// Open connection
	socket.manager.open(() => { socket.io.open(); });
}

// Terminate WebSocket client
function term(term_cb = null) {
	if (status.server.connected === false) {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
		return false;
	}

	status.server.connected    = false;
	status.server.connecting   = false;
	status.server.reconnecting = false;

	if (typeof socket.io !== 'undefined' && socket.io !== null) {
		socket.io.on('disconnect', () => {
			// Call function to reset the timeout
			// host_data.send();

			log.msg({
				msg : 'Shut down',
			});

			typeof term_cb === 'function' && process.nextTick(term_cb);
			term_cb = undefined;
		});

		socket.io.close(() => {
			log.msg({
				msg : 'io.close()',
			});
		});
	}
	else {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
	}
}


function msg_log(message) {
	log.msg({
		msg : message,
	});
}


module.exports = {
	io      : null,
	manager : null,

	timeouts : {},

	options : {
		autoConnect          : false,
		path                 : '/socket.io',
		perMessageDeflate    : false,
		pingInterval         : 2500,
		pingTimeout          : 10000,
		randomizationFactor  : 0.5,
		reconnection         : true,
		reconnectionAttempts : Infinity,
		reconnectionDelay    : 250,
		reconnectionDelayMax : 1000,
		rememberUpgrade      : true,
		timeout              : 2500,
		transports           : [ 'websocket' ],
	},


	// Generic data sender
	send : (event, data) => { send(event, data); },

	// Start/stop functions
	init : (init_cb) => { init(init_cb); },
	term : (term_cb) => { term(term_cb); },

	// Send USB LCD commands/text to bmwi
	lcd_color_tx   : (data) => { send('lcd-color',   data); },
	lcd_command_tx : (data) => { send('lcd-command', data); },
	lcd_text_tx    : (data) => { send('lcd-text',    data); },

	// Send vehicle bus data to bmwi instance
	bus_tx : (bus, data) => {
		send('bus-tx', {
			bus  : bus,
			data : data,
		});
	},

	// Send status data object for use by other WebSocket clients
	status_tx : (module) => {
		// If the entire status object was requested
		if (module == 'all') {
			log.msg({
				msg : 'Sending full status',
			});

			send('status', status);
			// host_data.send();
			return;
		}

		log.module({
			msg : 'Sending \'' + module + '\' status',
		});

		let msg = {};
		msg[module] = status[module];
		send('status', msg);
	},
};
