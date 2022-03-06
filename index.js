/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */


app_path = __dirname;
app_name = 'bmwcli';
app_intf = 'cli';

process.title = app_name;


// node-bmw libraries
json   = require('./lib/json.js');
log    = require('./share/log-output.js');
update = require('./share/update.js');
socket = require('./lib/socket.js');

terminal = require('terminal-kit').terminal;


// Configure term event listeners
function term_config(pass) {
	process.on('SIGTERM', () => {
		console.log('');
		log.msg('Caught SIGTERM');
		process.nextTick(term);
	});

	process.on('SIGINT', () => {
		console.log('');
		log.msg('Caught SIGINT');
		process.nextTick(term);
	});

	process.on('exit', () => {
		log.msg('Terminated');
	});

	process.nextTick(pass);
}

// Global init
function init() {
	terminal.slowTyping('Initializing node-bmw CLI\n\n', { delay : 25, flashDelay : 500, flashStyle : term.brightWhite }, () => {
		// log.msg('Initializing');

		json.read(() => { // Read JSON config and status files
			socket.init(() => { // Start socket.io client
				log.msg('Initialized');
			}, term);
		}, term);
	});
}

// Global term
function term() {
	log.msg('Terminating');

	socket.term(() => { // Stop socket.io client
		json.write(() => { // Write JSON config and status files
			process.exit();
		});
	});
}

// FASTEN SEATBELTS
term_config(init);
