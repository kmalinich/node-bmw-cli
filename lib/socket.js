/* eslint no-console: 0 */

// Handle incoming messages
function on_data(data) {
	// log.socket({
	// 	method : 'rx',
	// 	type   : data.host.type,
	// 	event  : data.event,
	// 	string : data.host.host.short,
	// });

	switch (data.event) {
		// case 'bus-rx'            : bus_data.receive(data.data); break;
		case 'host-data'         : on_host_data(data);          break;
		case 'host-data-request' : host_data.send();            break;
		case 'status-request'    : socket.status_tx(data.data); break;

		// case 'log-bus'     : log.bus   (data.message); break;
		// case 'log-msg'     : log.socket(data);         break; // Broken, fix this
		// case 'bus-tx'      :
		// case 'lcd-color'   :
		// case 'lcd-command' :
		// case 'lcd-text'    :
		// default            :
	}
}

// Handle incoming host-data messages
function on_host_data(data) {
	console.log(data);

	// log.socket({
	// 	method : 'rx',
	// 	type   : data.data.type,
	// 	event  : data.data.host.short + ' => temp',
	// 	string : data.data.temperature + 'c',
	// });
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
function init(init_callback = null) {
	if (status.server.connected === true) {
		log.msg({
			msg : 'Client already connected',
		});

		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
		return;
	}

	status.server.connected    = false;
	status.server.connecting   = true;
	status.server.reconnecting = false;

	msg_log('Connecting to ' + config.server.host + ':' + config.server.port);

	let url = 'http://' + config.server.host + ':' + config.server.port;

	socket.manager = require('socket.io-client').Manager(url, socket.options);
	socket.io      = socket.manager.socket('/');


	// Recieve data from other bmwcd instances
	socket.io.on('client-tx', (data) => { on_data(data); });

	// Receive data from bmwd
	socket.io.on('daemon-tx', (data) => { on_data(data); });


	socket.io.on('connect', () => {
		msg_log('Connected to ' + config.server.host + ':' + config.server.port);

		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Send this host's data to WebSocket clients to update them
		// host_data.send();

		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
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

		// Request ignition on reconnect
		IKE.request('ignition');
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

		// Reset basic vars
		json.status_reset_basic(() => {});
	});

	// Open connection
	socket.manager.open(() => { socket.io.open(); });
}

// Terminate WebSocket client
function term(term_callback = null) {
	if (status.server.connected === false) {
		if (typeof term_callback === 'function') term_callback();
		term_callback = undefined;
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

			if (typeof term_callback === 'function') term_callback();
			term_callback = undefined;
		});

		socket.io.close(() => {
			log.msg({
				msg : 'io.close()',
			});
		});
	}
	else {
		if (typeof term_callback === 'function') term_callback();
		term_callback = undefined;
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

	// Send USB LCD commands/text to bmwd
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
