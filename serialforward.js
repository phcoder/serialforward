/*
 * Copyright 2019 Google
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may 
 * not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www\.apache\.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

var socket = chrome.sockets.tcpServer;

function log(message) {
    document.getElementById('log').textContent += message + "\n";
}

var serialConnectionId = -1

var onSerialReceive = function(info) {
    if (info.connectionId == serialConnectionId) {
	clientSocketIds.forEach(function(clientSocketId) {
	    chrome.sockets.tcp.send(clientSocketId, info.data,
				    function(resultCode) {});
	    chrome.sockets.tcp.setNoDelay(clientSocketId, true, function(){})
	})
    }
};

function serialSend(msg) {
    chrome.serial.send(serialConnectionId, msg, function() {});
};

function onSerialConnect(connectionInfo) {
    if (connectionInfo != null) {
	serialConnectionId = connectionInfo.connectionId
	chrome.serial.onReceive.addListener(onSerialReceive);
    }
}

function serialClose() {
    chrome.serial.disconnect(serialConnectionId, function(result) {})
}

var serverSocketId;
var clientSocketIds = [];

function onAccept(info) {
    if (info.socketId != serverSocketId)
	return;
    chrome.sockets.tcp.onReceive.addListener(function(recvInfo) {
	if (recvInfo.socketId != info.clientSocketId)
	    return;
	serialSend(recvInfo.data)
    });
    clientSocketIds.push(info.clientSocketId)
    chrome.sockets.tcp.setPaused(info.clientSocketId, false);
}

function onListenCallback(socketId, resultCode) {
    if (resultCode < 0) {
	log("Error listening:" + chrome.runtime.lastError.message);
	return;
    }
    serverSocketId = socketId;
    chrome.sockets.tcpServer.onAccept.addListener(onAccept)
}

function listenAndAccept(socketId) {
    var tcpPortField = document.getElementById('tcpport')
    var tcpPort = parseInt(tcpPortField.value)
    log('Listen on port ' + tcpPort)
    chrome.sockets.tcpServer.listen(socketId,
				    "0.0.0.0", tcpPort, function(resultCode) {
					onListenCallback(socketId, resultCode)
				    });
}

function initTcp() {
    chrome.sockets.tcpServer.create({}, function(createInfo) {
	var sockId = createInfo.socketId
	listenAndAccept(sockId);
    });
}

function initSerial() {
    var portSelector = document.getElementById('port')
    var opt = portSelector.options[portSelector.selectedIndex];
    chrome.serial.connect(opt.value, {bitrate: 115200}, onSerialConnect);
}

function onInit() {
    enumPorts()
    document.getElementById("startForward").addEventListener("click", function() {startForward(); return false; });
}

function enumPorts() {
    var portSelector = document.getElementById('port')
    portSelector.innerHTML = '';
    chrome.serial.getDevices(
	function(ports) {
	    for (var i=0; i<ports.length; i++) {
		var option = document.createElement("option");
		option.text = ports[i].path;
		option.name = ports[i].path;
		portSelector.add(option, portSelector[0]);
	    }
	});
}

function startForward() {
    log('starting forward')
    initSerial()
    initTcp()
}

window.onload = onInit
