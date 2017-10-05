/* eslint no-global-assign: "off", no-console: "off" */

app_path = __dirname;
app_name = 'bmwcli';
app_intf = 'cli';

process.title = app_name;

// node-bmw libraries
json   = require('json');
log    = require('log-output');
socket = require('socket');
update = require('update');

terminal = require('terminal-kit').terminal;

// Configure term event listeners
function term_config(pass) {
	process.on('SIGTERM', () => {
		console.log('');
		log.msg({ msg : 'Caught SIGTERM' });
		process.nextTick(term);
	});

	process.on('SIGINT', () => {
		console.log('');
		log.msg({ msg : 'Caught SIGINT' });
		process.nextTick(term);
	});

	process.on('exit', () => {
		log.msg({ msg : 'Terminated' });
	});

	process.nextTick(pass);
}

// Global init
function init() {
	terminal.slowTyping('Initializing node-bmw CLI\n\n', { flashStyle : term.brightWhite }, () => {
		// log.msg({ msg : 'Initializing' });

		json.read(() => { // Read JSON config and status files
			socket.init(() => { // Start zeroMQ client
				log.msg({ msg : 'Initialized' });
			}, term);
		}, term);
	});
}

// Global term
function term() {
	log.msg({ msg : 'Terminating' });

	socket.term(() => { // Stop socket.io client
		json.write(() => { // Write JSON config and status files
			process.exit();
		});
	});
}

// FASTEN SEATBELTS
term_config(() => {
	init();
});
