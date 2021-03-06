//
// This 'server' variable we use to contact the Admin/Monitor backend is
// constructed in this example pretty much as we do in all the demos, so
// refer to the guidelines there with respect to absolute vs. relative
// paths and the like.
//
var server = null;
if(window.location.protocol === 'http:')
	server = "http://" + window.location.hostname + ":7088/admin";
else
	server = "https://" + window.location.hostname + ":7889/admin";
// If you don't want the page to prompt you for a password, insert it here
var secret = "janusoverlord";

var session = null;		// Selected session
var handle = null;		// Selected handle

var plugins = [];
var settings = {};

var currentHandle = null;
var localSdp = null, remoteSdp = null;

$(document).ready(function() {
	if(typeof console == "undefined" || typeof console.log == "undefined")
		console = { log: function() {} };
	$('#admintabs a').click(function (e) {
		e.preventDefault()
		$(this).tab('show')
	});
	if(!server)
		server = "";
	if(!secret)
		secret = "";
	if(server !== "" && secret !== "") {
		updateServerInfo();
	} else {
		promptAccessDetails();
	}
});

var prompting = false;
var alerted = false;
function promptAccessDetails() {
	if(prompting)
		return;
	prompting = true;
	var serverPlaceholder = "Insert the address of the Admin API backend";
	var secretPlaceholder = "Insert the Admin API secret";
	bootbox.alert({
		message: "<div class='input-group margin-bottom-sm'>" +
			"	<span class='input-group-addon'><i class='fa fa-cloud-upload fa-fw'></i></span>" +
			"	<input class='form-control' type='text' value='" + server + "' placeholder='" + serverPlaceholder + "' autocomplete='off' id='server'></input>" +
			"</div>" +
			"<div class='input-group margin-bottom-sm'>" +
			"	<span class='input-group-addon'><i class='fa fa-key fa-fw'></i></span>" +
			"	<input class='form-control' type='password'  value='" + secret + "'placeholder='" + secretPlaceholder + "' autocomplete='off' id='secret'></input>" +
			"</div>",
		closeButton: false,
		callback: function() {
			prompting = false;
			server = $('#server').val();
			secret = $('#secret').val();
			updateServerInfo();
		}
	});
}

// Helper method to create random identifiers (e.g., transaction)
function randomString(len) {
	charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var randomString = '';
	for (var i = 0; i < len; i++) {
		var randomPoz = Math.floor(Math.random() * charSet.length);
		randomString += charSet.substring(randomPoz,randomPoz+1);
	}
	return randomString;
}

// Server info
function updateServerInfo() {
	$.ajax({
		type: 'GET',
		url: server + "/info",
		cache: false,
		contentType: "application/json",
		success: function(json) {
			if(json["janus"] !== "server_info") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				if(!prompting && !alerted) {
					alerted = true;
					bootbox.alert(json["error"].reason, function() {
						promptAccessDetails();
						alerted = false;
					});
				}
				return;
			}
			console.log("Got server info:");
			console.log(json);
			var pluginsJson = json.plugins;
			var transportsJson = json.transports;
			delete json.janus;
			delete json.transaction;
			delete json.plugins;
			delete json.transports;
			for(var k in json) {
				var v = json[k];
				$('#server-details').append(
					'<tr>' +
					'	<td><b>' + k + ':</b></td>' +
					'	<td>' + v + '</td>' +
					'</tr>');
			}
			for(var p in pluginsJson) {
				plugins.push(p);
				var v = pluginsJson[p];
				$('#server-plugins').append(
					'<tr>' +
					'	<td>' + v.name + '</td>' +
					'	<td>' + v.author + '</td>' +
					'	<td>' + v.description + '</td>' +
					'	<td>' + v.version_string + '</td>' +
					'</tr>');
			}
			console.log(plugins);
			for(var t in transportsJson) {
				var v = transportsJson[t];
				$('#server-transports').append(
					'<tr>' +
					'	<td>' + v.name + '</td>' +
					'	<td>' + v.author + '</td>' +
					'	<td>' + v.description + '</td>' +
					'	<td>' + v.version_string + '</td>' +
					'</tr>');
			}
			// Unlock tabs
			$('#admintabs li').removeClass('disabled');
			// Refresh settings now
			updateSettings();
			// Refresh sessions and handles now
			$('#handles').hide();
			$('#info').hide();
			$('#update-sessions').click(updateSessions);
			$('#update-handles').click(updateHandles);
			$('#update-handle').click(updateHandleInfo);
			updateSessions();
			$("#autorefresh").change(function() {
				if(this.checked) {
					updateHandleInfo(true);
				}
			});
			$("#prettify").change(function() {
				if(this.checked) {
					prettyHandleInfo();
				} else {
					rawHandleInfo();
				}
			});
			// Only check tokens if the mechanism is enabled
			if(!json["auth_token"]) {
				$('a[href=#tokens]').parent().addClass('disabled');
				$('a[href=#tokens]').attr('href', '#').unbind('click').click(function (e) { e.preventDefault(); return false; });
			} else {
				updateTokens();
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

// Settings
function updateSettings() {
	$('#update-settings').unbind('click').addClass('fa-spin');
	var request = { "janus": "get_status", "transaction": randomString(12), "admin_secret": secret };
	$.ajax({
		type: 'POST',
		url: server,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				var authenticate = (json["error"].code === 403);
				if(!authenticate || (authenticate && !prompting && !alerted)) {
					if(authenticate)
						alerted = true;
					bootbox.alert(json["error"].reason, function() {
						if(authenticate) {
							promptAccessDetails();
							alerted = false;
						}
					});
				}
				setTimeout(function() {
					$('#update-settings').removeClass('fa-spin').click(updateSettings);
				}, 1000);
				return;
			}
			console.log("Got status:");
			console.log(json);
			setTimeout(function() {
				$('#update-settings').removeClass('fa-spin').click(updateSettings);
			}, 1000);
			$('#server-settings').empty();
			for(var k in json.status) {
				settings[k] = json.status[k];
				$('#server-settings').append(
					'<tr>' +
					'	<td><b>' + k + ':</b></td>' +
					'	<td>' + settings[k] + '</td>' +
					'	<td id="' + k + '"></td>' +
					'</tr>');
				if(k === 'session_timeout') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs btn-primary">Edit session timeout value</button>');
					$('#'+k + "_button").click(function() {
						bootbox.prompt("Set the new session timeout value (in seconds, currently " + settings["session_timeout"] + ")", function(result) {
							if(isNaN(result)) {
								bootbox.alert("Invalid session timeout value");
								return;
							}
							result = parseInt(result);
							if(result < 0) {
								console.log(isNaN(result));
								console.log(result < 0);
								bootbox.alert("Invalid session timeout value");
								return;
							}
							setSessionTimeoutValue(result);
						});
					});
				} else if(k === 'log_level') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs btn-primary">Edit log level</button>');
					$('#'+k + "_button").click(function() {
						bootbox.prompt("Set the new desired log level (0-7, currently " + settings["log_level"] + ")", function(result) {
							if(isNaN(result)) {
								bootbox.alert("Invalid log level (should be [0,7])");
								return;
							}
							result = parseInt(result);
							if(result < 0 || result > 7) {
								console.log(isNaN(result));
								console.log(result < 0);
								console.log(result > 7);
								bootbox.alert("Invalid log level (should be [0,7])");
								return;
							}
							setLogLevel(result);
						});
					});
				} else if(k === 'max_nack_queue') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs btn-primary">Edit max NACK queue</button>');
					$('#'+k + "_button").click(function() {
						bootbox.prompt("Set the new desired max NACK queue (a positive integer, currently " + settings["max_nack_queue"] + ")", function(result) {
							if(isNaN(result)) {
								bootbox.alert("Invalid max NACK queue (should be a positive integer)");
								return;
							}
							result = parseInt(result);
							if(result < 0) {
								bootbox.alert("Invalid max NACK queue (should be a positive integer)");
								return;
							}
							setMaxNackQueue(result);
						});
					});
				} else if(k === 'no_media_timer') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs btn-primary">Edit no-media timer value</button>');
					$('#'+k + "_button").click(function() {
						bootbox.prompt("Set the new desired no-media timer value (in seconds, currently " + settings["no_media_timer"] + ")", function(result) {
							if(isNaN(result)) {
								bootbox.alert("Invalid no-media timer (should be a positive integer)");
								return;
							}
							result = parseInt(result);
							if(result < 0) {
								bootbox.alert("Invalid no-media timer (should be a positive integer)");
								return;
							}
							setNoMediaTimer(result);
						});
					});
				} else if(k === 'locking_debug') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs"></button>');
					$('#'+k + "_button")
						.addClass(!settings[k] ? "btn-success" : "btn-danger")
						.html(!settings[k] ? "Enable locking debug" : "Disable locking debug");
					$('#'+k + "_button").click(function() {
						var text = (!settings["locking_debug"] ?
							"Are you sure you want to enable the locking debug?<br/>This will print a line on the console any time a mutex is locked/unlocked"
								: "Are you sure you want to disable the locking debug?");
						bootbox.confirm(text, function(result) {
							if(result)
								setLockingDebug(!settings["locking_debug"]);
						});
					});
				} else if(k === 'refcount_debug') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs"></button>');
					$('#'+k + "_button")
						.addClass(!settings[k] ? "btn-success" : "btn-danger")
						.html(!settings[k] ? "Enable reference counters debug" : "Disable reference counters debug");
					$('#'+k + "_button").click(function() {
						var text = (!settings["refcount_debug"] ?
							"Are you sure you want to enable the reference counters debug?<br/>This will print a line on the console any time a reference counter is increased/decreased"
								: "Are you sure you want to disable the reference counters debug?");
						bootbox.confirm(text, function(result) {
							if(result)
								setRefcountDebug(!settings["refcount_debug"]);
						});
					});
				} else if(k === 'log_timestamps') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs"></button>');
					$('#'+k + "_button")
						.addClass(!settings[k] ? "btn-success" : "btn-danger")
						.html(!settings[k] ? "Enable log timestamps" : "Disable log timestamps");
					$('#'+k + "_button").click(function() {
						var text = (!settings["log_timestamps"] ?
							"Are you sure you want to enable the log timestamps?<br/>This will print the current date/time for each new line on the console"
								: "Are you sure you want to disable the log timestamps?");
						bootbox.confirm(text, function(result) {
							if(result)
								setLogTimestamps(!settings["log_timestamps"]);
						});
					});
				} else if(k === 'log_colors') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs"></button>');
					$('#'+k + "_button")
						.addClass(!settings[k] ? "btn-success" : "btn-danger")
						.html(!settings[k] ? "Enable log colors" : "Disable log colors");
					$('#'+k + "_button").click(function() {
						var text = (!settings["log_colors"] ?
							"Are you sure you want to enable the log colors?<br/>This will strip the colors from events like warnings, errors, etc. on the console"
								: "Are you sure you want to disable the log colors?");
						bootbox.confirm(text, function(result) {
							if(result)
								setLogColors(!settings["log_colors"]);
						});
					});
				} else if(k === 'libnice_debug') {
					$('#'+k).append('<button id="' + k + '_button" type="button" class="btn btn-xs"></button>');
					$('#'+k + "_button")
						.addClass(!settings[k] ? "btn-success" : "btn-danger")
						.html(!settings[k] ? "Enable libnice debug" : "Disable libnice debug");
					$('#'+k + "_button").click(function() {
						var text = (!settings["libnice_debug"] ?
							"Are you sure you want to enable the libnice debug?<br/>This will print the a very verbose debug of every libnice-related operation on the console"
								: "Are you sure you want to disable the libnice debug?");
						bootbox.confirm(text, function(result) {
							if(result)
								setLibniceDebug(!settings["libnice_debug"]);
						});
					});
				}
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			$('#update-settings').removeClass('fa-spin').click(updateSettings);
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

function setSessionTimeoutValue(timeout) {
	var request = { "janus": "set_session_timeout", "timeout": timeout, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setLogLevel(level) {
	var request = { "janus": "set_log_level", "level": level, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setLockingDebug(enable) {
	var request = { "janus": "set_locking_debug", "debug": enable, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setRefcountDebug(enable) {
	var request = { "janus": "set_refcount_debug", "debug": enable, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setLogTimestamps(enable) {
	var request = { "janus": "set_log_timestamps", "timestamps": enable, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setLogColors(enable) {
	var request = { "janus": "set_log_colors", "colors": enable, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setLibniceDebug(enable) {
	var request = { "janus": "set_libnice_debug", "debug": enable, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setMaxNackQueue(queue) {
	var request = { "janus": "set_max_nack_queue", "max_nack_queue": queue, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function setNoMediaTimer(timer) {
	var request = { "janus": "set_no_media_timer", "no_media_timer": timer, "transaction": randomString(12), "admin_secret": secret };
	sendSettingsRequest(request);
}

function sendSettingsRequest(request) {
	console.log(request);
	$.ajax({
		type: 'POST',
		url: server,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				var authenticate = (json["error"].code === 403);
				if(!authenticate || (authenticate && !prompting && !alerted)) {
					if(authenticate)
						alerted = true;
					bootbox.alert(json["error"].reason, function() {
						if(authenticate) {
							promptAccessDetails();
							alerted = false;
						}
					});
				}
				return;
			}
			updateSettings();
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

// Handles
function updateSessions() {
	$('#update-sessions').unbind('click').addClass('fa-spin');
	$('#update-handles').unbind('click');
	$('#update-handle').unbind('click');
	var request = { "janus": "list_sessions", "transaction": randomString(12), "admin_secret": secret };
	$.ajax({
		type: 'POST',
		url: server,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				var authenticate = (json["error"].code === 403);
				if(!authenticate || (authenticate && !prompting && !alerted)) {
					if(authenticate)
						alerted = true;
					bootbox.alert(json["error"].reason, function() {
						if(authenticate) {
							promptAccessDetails();
							alerted = false;
						}
					});
				}
				setTimeout(function() {
					$('#update-sessions').removeClass('fa-spin').click(updateSessions);
					$('#update-handles').click(updateHandles);
					$('#update-handle').click(updateHandleInfo);
				}, 1000);
				session = null;
				handle = null;
				currentHandle = null;
				$('#handles-list').empty();
				$('#handles').hide();
				$('#handle-info').empty();
				$('#options').hide();
				$('#info').hide();
				return;
			}
			console.log("Got sessions:");
			console.log(json);
			$('#sessions-list').empty();
			var sessions = json["sessions"];
			$('#sessions-num').text(sessions.length);
			for(var i=0; i<sessions.length; i++) {
				var s = sessions[i];
				$('#sessions-list').append(
					'<a id="session-'+s+'" href="#" class="list-group-item">'+s+'</a>'
				);
				$('#session-'+s).click(function() {
					var sh = $(this).text();
					console.log("Getting session " + sh + " handles");
					session = sh;
					$('#sessions-list a').removeClass('active');
					$('#session-'+sh).addClass('active');
					handle = null;
					currentHandle = null;
					$('#handles-list').empty();
					$('#handles').show();
					$('#handle-info').empty();
					$('#options').hide();
					$('#info').hide();
					updateHandles();
				});
			}
			if(session !== null && session !== undefined) {
				if($('#session-'+session).length) {
					$('#session-'+session).addClass('active');
				} else {
					// The session that was selected has disappeared
					session = null;
					handle = null;
					currentHandle = null;
					$('#handles-list').empty();
					$('#handles').hide();
					$('#handle-info').empty();
					$('#options').hide();
					$('#info').hide();
				}
			}
			setTimeout(function() {
				$('#update-sessions').removeClass('fa-spin').click(updateSessions);
				$('#update-handles').click(updateHandles);
				$('#update-handle').click(updateHandleInfo);
			}, 1000);
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			setTimeout(function() {
				$('#update-sessions').removeClass('fa-spin').click(updateSessions);
				$('#update-handles').click(updateHandles);
				$('#update-handle').click(updateHandleInfo);
			}, 1000);
			session = null;
			handle = null;
			currentHandle = null;
			$('#handles-list').empty();
			$('#handles').hide();
			$('#handle-info').empty();
			$('#options').hide();
			$('#info').hide();
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

function updateHandles() {
	if(session === null || session === undefined)
		return;
	$('#update-sessions').unbind('click');
	$('#update-handles').unbind('click').addClass('fa-spin');
	$('#update-handle').unbind('click');
	var request = { "janus": "list_handles", "transaction": randomString(12), "admin_secret": secret };
	$.ajax({
		type: 'POST',
		url: server + "/" + session,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				var authenticate = (json["error"].code === 403);
				if(!authenticate || (authenticate && !prompting && !alerted)) {
					if(authenticate)
						alerted = true;
					bootbox.alert(json["error"].reason, function() {
						if(authenticate) {
							promptAccessDetails();
							alerted = false;
						}
					});
				}
				setTimeout(function() {
					$('#update-handles').removeClass('fa-spin').click(updateHandles);
					$('#update-sessions').click(updateSessions);
					$('#update-handle').click(updateHandleInfo);
				}, 1000);
				return;
			}
			console.log("Got handles:");
			console.log(json);
			$('#handles-list').empty();
			var handles = json["handles"];
			$('#handles-num').text(handles.length);
			for(var i=0; i<handles.length; i++) {
				var h = handles[i];
				$('#handles-list').append(
					'<a id="handle-'+h+'" href="#" class="list-group-item">'+h+'</a>'
				);
				$('#handle-'+h).click(function() {
					var hi = $(this).text();
					console.log("Getting handle " + hi + " info");
					handle = hi;
					if(handle === currentHandle)
						return;	// The self-refresh takes care of that
					$('#handles-list a').removeClass('active');
					$('#handle-'+hi).addClass('active');
					$('#handle-info').empty();
					$('#options').hide();
					$('#info').show();
					updateHandleInfo();
				});
			}
			if(handle !== null && handle !== undefined) {
				if($('#handle-'+handle).length) {
					$('#handle-'+handle).addClass('active');
				} else {
					// The handle that was selected has disappeared
					handle = null;
					currentHandle = null;
					$('#handle-info').empty();
					$('#options').hide();
					$('#info').hide();
				}
			}
			setTimeout(function() {
				$('#update-handles').removeClass('fa-spin').click(updateHandles);
				$('#update-sessions').click(updateSessions);
				$('#update-handle').click(updateHandleInfo);
			}, 1000);
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			$('#update-handles').removeClass('fa-spin').click(updateHandles);
			$('#update-sessions').click(updateSessions);
			$('#update-handle').click(updateHandleInfo);
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

function updateHandleInfo(refresh) {
	if(handle === null || handle === undefined)
		return;
	if(refresh !== true) {
		if(handle === currentHandle && $('#autorefresh')[0].checked)
			return;	// The self-refresh takes care of that
		currentHandle = handle;
	}
	var updateHandle = currentHandle;
	$('#update-sessions').unbind('click');
	$('#update-handles').unbind('click');
	$('#update-handle').unbind('click').addClass('fa-spin');
	var request = { "janus": "handle_info", "transaction": randomString(12), "admin_secret": secret };
	$.ajax({
		type: 'POST',
		url: server + "/" + session + "/" + handle,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				if(refresh !== true) {
					var authenticate = (json["error"].code === 403);
					if(!authenticate || (authenticate && !prompting && !alerted)) {
						if(authenticate)
							alerted = true;
						bootbox.alert(json["error"].reason, function() {
							if(authenticate) {
								promptAccessDetails();
								alerted = false;
							}
						});
					}
				}
				setTimeout(function() {
					$('#update-sessions').click(updateSessions);
					$('#update-handles').click(updateHandles);
					$('#update-handle').removeClass('fa-spin').click(updateHandleInfo);
				}, 1000);
				return;
			}
			console.log("Got info:");
			console.log(json);
			handleInfo = json["info"];
			if($('#prettify')[0].checked) {
				prettyHandleInfo();
			} else {
				rawHandleInfo();
			}
			setTimeout(function() {
				$('#update-sessions').click(updateSessions);
				$('#update-handles').click(updateHandles);
				$('#update-handle').removeClass('fa-spin').click(updateHandleInfo);
			}, 1000);
			// Show checkboxes
			$('#options').removeClass('hide').show();
			// If the related box is checked, autorefresh this handle info every tot seconds
			if($('#autorefresh')[0].checked) {
				setTimeout(function() {
					if(updateHandle !== currentHandle) {
						// The handle changed in the meanwhile, don't autorefresh
						return;
					}
					if(!$('#autorefresh')[0].checked) {
						// Unchecked in the meantime
						return;
					}
					updateHandleInfo(true);
				}, 5000);
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			$('#update-handles').removeClass('fa-spin').click(updateHandles);
			$('#update-sessions').click(updateSessions);
			$('#update-handle').click(updateHandleInfo);
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

function rawHandleInfo() {
	// Just use <pre> and show the handle info as it is
	$('#handle-info').html('<pre>' + JSON.stringify(handleInfo, null, 4) + '</pre>');
}

function prettyHandleInfo() {
	// Prettify the handle info, processing it and turning it into tables
	$('#handle-info').html('<table class="table table-striped" id="handle-info-table"></table>');
	$('#options').hide();
	for(var k in handleInfo) {
		var v = handleInfo[k];
		if(k === "plugin_specific") {
			$('#handle-info').append(
				'<h4>Plugin specific details</h4>' +
				'<table class="table table-striped" id="plugin-specific">' +
				'</table>');
			for(var kk in v) {
				var vv = v[kk];
				$('#plugin-specific').append(
					'<tr>' +
					'	<td><b>' + kk + ':</b></td>' +
					'	<td>' + vv + '</td>' +
					'</tr>');
			}
		} else if(k === "flags") {
			$('#handle-info').append(
				'<h4>Flags</h4>' +
				'<table class="table table-striped" id="flags">' +
				'</table>');
			for(var kk in v) {
				var vv = v[kk];
				$('#flags').append(
					'<tr>' +
					'	<td><b>' + kk + ':</b></td>' +
					'	<td>' + vv + '</td>' +
					'</tr>');
			}
		} else if(k === "sdps") {
			localSdp = null;
			remoteSdp = null;
			$('#handle-info').append(
				'<h4>Session descriptions (SDP)</h4>' +
				'<table class="table table-striped" id="sdps">' +
				'</table>');
			for(var kk in v) {
				var vv = v[kk];
				if(kk === "local") {
					localSdp = vv;
				} else if(kk === "remote") {
					remoteSdp = vv;
				} else {
					// What? Skip
					continue;
				}
				$('#sdps').append(
					'<tr>' +
					'	<td><b>' + kk + ':</b></td>' +
					'	<td><a id="' + kk + '" href="#">' + vv.substring(0, 40) + '...</a></td>' +
					'</tr>');
				$('#' + kk).click(function(event) {
					event.preventDefault();
					var sdp = $(this).attr('id') === "local" ? localSdp : remoteSdp;
					bootbox.dialog({
						title: "SDP (" + $(this).attr('id') + ")",
						message: '<div style="max-height: ' + ($(window).height()*2/3) + 'px; overflow-y: auto;">' + sdp.split("\r\n").join("<br/>") + '</div>'
					});
				});
			}
		} else if(k === "streams") {
			$('#handle-info').append(
				'<h4>ICE streams</h4>' +
				'<div id="streams"></table>');
			for(var kk in v) {
				$('#streams').append(
					'<h5>Stream #' + (parseInt(kk)+1) + '</h5>' +
					'<table class="table table-striped" id="stream' + kk + '">' +
					'</table>');
				var vv = v[kk];
				console.log(vv);
				for(var sk in vv) {
					var sv = vv[sk];
					if(sk === "ssrc") {
						$('#stream' + kk).append(
							'<tr>' +
								'<td colspan="2">' +
									'<h6>SSRC</h6>' +
									'<table class="table" id="ssrc' + kk + '">' +
									'</table>' +
								'</td>' +
							'</tr>');
						for(var ssk in sv) {
							var ssv = sv[ssk];
							$('#ssrc' + kk).append(
								'<tr>' +
								'	<td><b>' + ssk + ':</b></td>' +
								'	<td>' + ssv + '</td>' +
								'</tr>');
						}
					} else if(sk === "components") {
						$('#stream' + kk).append(
							'<tr>' +
								'<td colspan="2">' +
									'<h6>Components of Stream #' + (parseInt(kk)+1) + '</h6>' +
									'<table class="table" id="components' + kk + '">' +
									'</table>' +
								'</td>' +
							'</tr>');
						for(var ssk in sv) {
							var ssv = sv[ssk];
							$('#components' + kk).append(
								'<tr>' +
									'<td colspan="2">' +
										'<h6>Component #' + (parseInt(ssk)+1) + '</h6>' +
										'<table class="table" id="stream' + kk + 'component' + ssk + '">' +
										'</table>' +
									'</td>' +
								'</tr>');
							for(var cssk in ssv) {
								var cssv = ssv[cssk];
								if(cssk === "local-candidates" || cssk === "remote-candidates") {
									var candidates = "<ul>";
									for(var c in cssv)
										candidates += "<li>" + cssv[c] + "</li>";
									candidates += "</ul>";
									$('#stream' + kk + 'component' + ssk).append(
										'<tr>' +
										'	<td><b>' + cssk + ':</b></td>' +
										'	<td>' + candidates + '</td>' +
										'</tr>');
								} else if(cssk === "dtls" || cssk === "in_stats" || cssk === "out_stats") {
									var dtls = '<table class="table">';
									for(var d in cssv) {
										dtls +=
											'<tr>' +
												'<td style="width:150px;"><b>' + d + '</b></td>' +
												'<td>' + cssv[d] + '</td>' +
											'</tr>';
									}
									dtls += '</table>';
									$('#stream' + kk + 'component' + ssk).append(
										'<tr>' +
										'	<td style="width:150px;"><b>' + cssk + ':</b></td>' +
										'	<td>' + dtls + '</td>' +
										'</tr>');
								} else {
									$('#stream' + kk + 'component' + ssk).append(
										'<tr>' +
										'	<td><b>' + cssk + ':</b></td>' +
										'	<td>' + cssv + '</td>' +
										'</tr>');
								}
							}
						}
					} else {
						$('#stream' + kk).append(
							'<tr>' +
							'	<td><b>' + sk + ':</b></td>' +
							'	<td>' + sv + '</td>' +
							'</tr>');
					}
				}
			}
		} else {
			$('#handle-info-table').append(
				'<tr>' +
				'	<td><b>' + k + ':</b></td>' +
				'	<td>' + v + '</td>' +
				'</tr>');
		}
	}
	$('#options').show();
}

// Tokens
function updateTokens() {
	$('#update-tokens').unbind('click').addClass('fa-spin');
	var request = { "janus": "list_tokens", "transaction": randomString(12), "admin_secret": secret };
	$.ajax({
		type: 'POST',
		url: server,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				var authenticate = (json["error"].code === 403);
				if(!authenticate || (authenticate && !prompting && !alerted)) {
					if(authenticate)
						alerted = true;
					bootbox.alert(json["error"].reason, function() {
						if(authenticate) {
							promptAccessDetails();
							alerted = false;
						}
					});
				}
				setTimeout(function() {
					$('#update-tokens').removeClass('fa-spin').click(updateTokens);
				}, 1000);
				return;
			}
			console.log("Got tokens:");
			console.log(json.data.tokens);
			setTimeout(function() {
				$('#update-tokens').removeClass('fa-spin').click(updateTokens);
			}, 1000);
			$('#auth-tokens').html(
				'<tr>' +
				'	<th>Token</th>' +
				'	<th>Permissions</th>' +
				'	<th></th>' +
				'</tr>');
			for(var index in json.data.tokens) {
				var t = json.data.tokens[index];
				var tokenPlugins = t.allowed_plugins.toString().replace(/,/g,'<br/>');
				$('#auth-tokens').append(
					'<tr>' +
					'	<td>' + t.token + '</td>' +
					'	<td>' + tokenPlugins + '</td>' +
					'	<td><button  id="' + t.token + '" type="button" class="btn btn-xs btn-danger">Remove token</button></td>' +
					'</tr>');
				$('#'+t.token).click(function() {
					var token = $(this).attr('id');
					bootbox.confirm("Are you sure you want to remove token " + token + "?", function(result) {
						if(result)
							removeToken(token);
					});
				});
			}
			$('#auth-tokens').append(
				'<tr>' +
				'	<td><input type="text" id="token" placeholder="Token to add" onkeypress="return checkEnter(this, event);" style="width: 100%;"></td>' +
				'	<td><div id="permissions"></div></td>' +
				'	<td><button id="addtoken" type="button" class="btn btn-xs btn-success">Add token</button></td>' +
				'</tr>');
			var pluginsCheckboxes = "";
			for(var i in plugins) {
				var plugin = plugins[i];
				pluginsCheckboxes +=
					'<div class="checkbox">' +
					'	<label>' +
					'		<input checked type="checkbox" value="' + plugin + '">' + plugin + '</input>' +
					'</div>';
			}
			$('#permissions').html(pluginsCheckboxes);
			$('#addtoken').click(function() {
				var token = $("#token").val().replace(/ /g,'');
				if(token === "") {
					bootbox.alert("Please insert a valid token string");
					return;
				}
				var checked = $(':checked');
				if(checked.length === 0) {
					bootbox.alert("Please allow the token access to at least a plugin");
					return;
				}
				var pluginPermissions = [];
				for(var i=0; i<checked.length; i++)
					pluginPermissions.push(checked[i].value);
				var text = "Are you sure you want to add the new token " + token + " with access to the following plugins?" +
					"<br/><ul>";
				for(var i in pluginPermissions)
					text += "<li>" + pluginPermissions[i] + "</li>";
				text += "</ul>";
				bootbox.confirm(text, function(result) {
					if(result)
						addToken(token, pluginPermissions);
				});
			});
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			$('#update-settings').removeClass('fa-spin').click(updateSettings);
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

function addToken(token, permissions) {
	var request = { "janus": "add_token", "token": token, plugins: permissions, "transaction": randomString(12), "admin_secret": secret };
	sendTokenRequest(request);
}

function removeToken(token) {
	var request = { "janus": "remove_token", "token": token, "transaction": randomString(12), "admin_secret": secret };
	sendTokenRequest(request);
}

function sendTokenRequest(request) {
	console.log(request);
	$.ajax({
		type: 'POST',
		url: server,
		cache: false,
		contentType: "application/json",
		data: JSON.stringify(request),
		success: function(json) {
			if(json["janus"] !== "success") {
				console.log("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
				var authenticate = (json["error"].code === 403);
				if(!authenticate || (authenticate && !prompting && !alerted)) {
					if(authenticate)
						alerted = true;
					bootbox.alert(json["error"].reason, function() {
						if(authenticate) {
							promptAccessDetails();
							alerted = false;
						}
					});
				}
				return;
			}
			updateTokens();
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			console.log(textStatus + ": " + errorThrown);	// FIXME
			if(!prompting && !alerted) {
				alerted = true;
				bootbox.alert("Couldn't contact the backend: is Janus down, or is the Admin/Monitor interface disabled?", function() {
					promptAccessDetails();
					alerted = false;
				});
			}
		},
		dataType: "json"
	});
}

function checkEnter(field, event) {
	var theCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode;
	if(theCode == 13) {
		if(field.id == 'token')
			$('#addtoken').click();
		return false;
	} else {
		return true;
	}
}
