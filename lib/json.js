/* eslint no-global-assign: 0 */

const write_options = { spaces : 2 };

const defaults = require('defaults-deep');
const jsonfile = require('jsonfile');

const file_config = app_path + '/config.json';
const file_status = app_path + '/status.json';

const config_default = require('config-default');
const status_default = require('status-default');

// Read config+status
function read(read_cb = null) {
	config_read(() => { // Read JSON config file
		status_read(() => { // Read JSON status file
			typeof read_cb === 'function' && process.nextTick(read_cb);
		}, read_cb);
	}, read_cb);
}

// Write config+status
function write(write_cb = null) {
	config_write(() => { // Write JSON config file
		status_write(write_cb); // Write JSON status file
	}, write_cb);
}

// Read config JSON
function config_read(config_read_cb = null) {
	jsonfile.readFile(file_config, (error, obj) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to read config, error ' + error.errno + ' (' + error.code + ')' });

			config = config_default;
			config_write(config_read_cb);
			return false;
		}

		// Lay the default values on top of the read object,
		// in case new values were added
		config = defaults(obj, config_default);

		log.msg({ msg : 'Read config' });

		typeof config_read_cb === 'function' && process.nextTick(config_read_cb);
		config_read_cb = undefined;
	});
}

// Write config JSON
function config_write(config_write_cb = null) {
	// Don't write if empty
	if (
		typeof config        === 'undefined' ||
		typeof config.server === 'undefined'
	) {
		log.msg({ msg : 'Failed to write config, config object empty' });

		if (typeof config_write_cb !== 'function') return;

		setTimeout(() => {
			process.nextTick(config_write_cb);
			config_write_cb = undefined;
		}, 250);

		return;
	}

	jsonfile.writeFileSync(file_config, config, write_options);
	log.msg({ msg : 'Wrote config' });

	if (typeof config_write_cb === 'function') {
		setTimeout(() => {
			process.nextTick(config_write_cb);
			config_write_cb = undefined;
		}, 250);
	}
}

// Read status JSON
function status_read(status_read_cb = null) {
	jsonfile.readFile(file_status, (error, obj) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to read status, error ' + error.errno + ' (' + error.code + ')' });

			status = status_default;
			status_write(status_read_cb);
			return false;
		}

		// Lay the default values on top of the read object,
		// in case new values were added
		status = defaults(obj, status_default);

		log.msg({ msg : 'Read status' });

		typeof status_read_cb === 'function' && process.nextTick(status_read_cb);
		status_read_cb = undefined;
	});
}

// Write status JSON
function status_write(status_write_cb = null) {
	// Don't write if empty
	if (
		typeof status        === 'undefined' ||
		typeof status.server === 'undefined'
	) {
		log.msg({ msg : 'Failed to write status, status object empty' });

		if (typeof status_write_cb !== 'function') return;

		setTimeout(() => {
			process.nextTick(status_write_cb);
			status_write_cb = undefined;
		}, 250);

		return;
	}

	jsonfile.writeFileSync(file_status, status, write_options);
	log.msg({ msg : 'Wrote status' });

	if (typeof status_write_cb === 'function') {
		setTimeout(() => {
			process.nextTick(status_write_cb);
			status_write_cb = undefined;
		}, 250);
	}
}


module.exports = {
	read         : read,
	write        : write,
	config_read  : config_read,
	config_write : config_write,
	status_read  : status_read,
	status_write : status_write,
};
