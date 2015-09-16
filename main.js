////////////////////////////////////////////////////////////////////////////////

var net = require('net');
var bufferpack = require('bufferpack');

////////////////////////////////////////////////////////////////////////////////

var kServerVersion = 1;
var kServerName = "Oasis";

////////////////////////////////////////////////////////////////////////////////

var kNetConnectReq 				= 1;
var kNetConnectRes 				= 2;
var kNetDisconnectReq 			= 3;

var kNetGetServerInfoReq 		= 4;
var kNetGetServerInfoRes 		= 5;

var kNetGetPlayerInfoReq 		= 6;
var kNetGetPlayerInfoRes 		= 7;

var kNetSendPlayerUpdate 		= 8;
var kNetRecvPlayerUpdate 		= 9;
var kNetRecvPlayerConnect 		= 10;
var kNetRecvPlayerDisconnect 	= 11;

var kNetSendMessage 			= 12;
var kNetRecvMessage 			= 13;

////////////////////////////////////////////////////////////////////////////////

// var connectReqMsgDef = struct.def()
// 	.int32le("type", kNetConnectReq)
// var connectResMsgDef = struct.def()
// 	.int32le("type", kNetConnectRes)
// var disconnectReqMsgDef = struct.def()
// 	.int32le("type", kNetDisconnectReq)

// var getServerInfoReqMsgDef = struct.def()
// 	.int32le("type", kNetGetServerInfoReq)
// var getServerInfoResMsgDef = struct.def()
// 	.int32le("type", kNetGetServerInfoRes)

// var getPlayerInfoReqDef = struct.def()
// 	.int32le("type", kNetGetPlayerInfoReq)
// 	.int32le("playerId", -1);
// var getPlayerInfoResDef = struct.def()
// 	.int32le("type", kNetGetPlayerInfoRes)
// 	.int32le("playerId", -1);

// var sendPlayerUpdateDef = struct.def()
// 	.int32le("type", kNetSendPlayerUpdate)
// 	.int64le("location", {int64mode:struct.int64modes.copy})
// 	.floatle("p_x", 0.0)
// 	.floatle("p_y", 0.0)
// 	.floatle("p_z", 0.0)
// 	.floatle("p_w", 0.0)
// 	.floatle("hr_x", 0.0)
// 	.floatle("hr_y", 0.0)
// 	.floatle("hr_z", 0.0)
// 	.floatle("hr_w", 0.0)
// 	.floatle("br_x", 0.0)
// 	.floatle("br_y", 0.0)
// 	.floatle("br_z", 0.0)
// 	.floatle("br_w", 0.0);
// var recvPlayerUpdateDef = struct.def()
// 	.int32le("type", kNetRecvPlayerUpdate)
// 	.int32le("playerId", -1);
// 	.int64le("location", {int64mode:struct.int64modes.copy})
// 	.floatle("p_x", 0.0)
// 	.floatle("p_y", 0.0)
// 	.floatle("p_z", 0.0)
// 	.floatle("p_w", 0.0)
// 	.floatle("hr_x", 0.0)
// 	.floatle("hr_y", 0.0)
// 	.floatle("hr_z", 0.0)
// 	.floatle("hr_w", 0.0)
// 	.floatle("br_x", 0.0)
// 	.floatle("br_y", 0.0)
// 	.floatle("br_z", 0.0)
// 	.floatle("br_w", 0.0);
// var recvPlayerConnectDef = struct.def()
// 	.int32le("type", kNetRecvPlayerConnect)
// 	.int32le("playerId", -1);
// var decvPlayerDisconnectDef = struct.def()
// 	.int32le("type", kNetRecvPlayerDisconnect)
// 	.int32le("playerId", -1);

// var sendMessageDef = struct.def()
// 	.int32le("type", kNetSendMessage)
// var recvMessageDef = struct.def()
// 	.int32le("type", kNetRecvMessage)

////////////////////////////////////////////////////////////////////////////////

// Format | C Type         | JavaScript Type   | Size (octets) | Notes
// -------------------------------------------------------------------
//    A   | char[]         | Array             |     Length     |  (1)
//    x   | pad byte       | N/A               |        1       |
//    c   | char           | string (length 1) |        1       |  (2)
//    b   | signed char    | number            |        1       |  (3)
//    B   | unsigned char  | number            |        1       |  (3)
//    h   | signed short   | number            |        2       |  (3)
//    H   | unsigned short | number            |        2       |  (3)
//    i   | signed long    | number            |        4       |  (3)
//    I   | unsigned long  | number            |        4       |  (3)
//    l   | signed long    | number            |        4       |  (3)
//    L   | unsigned long  | number            |        4       |  (3)
//    S   | C string       | string            |        *       |  (6)
//    s   | char[]         | string            |     Length     |  (2)
//    f   | float          | number            |        4       |  (4)
//    d   | double         | number            |        8       |  (5)

var msgFormatDefMapping = {};

msgFormatDefMapping[kNetConnectReq] = '<H';
msgFormatDefMapping[kNetConnectRes] = '<H';
msgFormatDefMapping[kNetDisconnectReq] = '<H';

msgFormatDefMapping[kNetGetServerInfoReq] = '<H';
msgFormatDefMapping[kNetGetServerInfoRes] = '<Hb64s';

msgFormatDefMapping[kNetGetPlayerInfoReq] = '<HH';
msgFormatDefMapping[kNetGetPlayerInfoRes] = '<HH64s';

msgFormatDefMapping[kNetSendPlayerUpdate] = '<HHIfffffffffffffffff';
msgFormatDefMapping[kNetRecvPlayerUpdate] = '<HHIfffffffffffffffff';
msgFormatDefMapping[kNetRecvPlayerConnect] = '<HH';
msgFormatDefMapping[kNetRecvPlayerDisconnect] = '<HH';

msgFormatDefMapping[kNetSendMessage] = '<HH64s';
msgFormatDefMapping[kNetRecvMessage] = '<HH64s';

////////////////////////////////////////////////////////////////////////////////

function deserializeObjectToBuffer(def, object){
	var buffer = new Buffer(def.size);
	def.write(object, buffer);
	return buffer;
}

////////////////////////////////////////////////////////////////////////////////

// Find message definition by type
function messageFormatByType(type){
	if(type in msgFormatDefMapping){
		return msgFormatDefMapping[type];
	}
	return null;
}
// Deserialize message from buffer
function deserializeMessageFromData(data){
	var type = data.readUInt16LE(0, 4);

	var format = messageFormatByType(type);
	var message = null;

	if(format == null){
		console.log("Failed to deserialize message of type: " + type);
		return null;
	}

	message = bufferpack.unpack(format, data, 0)
	var size = bufferpack.calcLength(format, data);

	return [message, size];
}

////////////////////////////////////////////////////////////////////////////////

function PlayerInfo(){
	var _this = this;

	this.playerId = -1;
	this.locationId = -1;

	this.velocity = [0.0, 0.0, 0.0];
	this.bodyPosition = [0.0, 0.0, 0.0];
	this.bodyRotation = [0.0, 0.0, 0.0, 1.0];
	this.headPosition = [0.0, 0.0, 0.0];
	this.headRotation = [0.0, 0.0, 0.0, 1.0];

	this.serializeUpdateMessage = function(){
		var data = [kNetRecvPlayerUpdate, _this.playerId, _this.locationId, 
			this.velocity[0], this.velocity[1], this.velocity[2],
			this.bodyPosition[0], this.bodyPosition[1], this.bodyPosition[2],
			this.bodyRotation[0], this.bodyRotation[1], this.bodyRotation[2], this.bodyRotation[3],
			this.headPosition[0], this.headPosition[1], this.headPosition[2],
			this.headRotation[0], this.headRotation[1], this.headRotation[2], this.headRotation[3]];
		var message = bufferpack.pack(
			messageFormatByType(kNetRecvPlayerUpdate), 
			data);
		return message;
	}
	this.deserializeUpdateMessage = function(msg){
		_this.locationId = msg[2];

		_this.velocity[0] = msg[3];
		_this.velocity[1] = msg[4];
		_this.velocity[2] = msg[5];

		_this.bodyPosition[0] = msg[6];
		_this.bodyPosition[1] = msg[7];
		_this.bodyPosition[2] = msg[8];

		_this.bodyRotation[0] = msg[9];
		_this.bodyRotation[1] = msg[10];
		_this.bodyRotation[2] = msg[11];
		_this.bodyRotation[3] = msg[12];

		_this.headPosition[0] = msg[13];
		_this.headPosition[1] = msg[14];
		_this.headPosition[2] = msg[15];

		_this.headRotation[0] = msg[16];
		_this.headRotation[1] = msg[17];
		_this.headRotation[2] = msg[18];
		_this.headRotation[3] = msg[19];
	}
}

////////////////////////////////////////////////////////////////////////////////

var kServerBroadcastFrequency = 1000;

var clients = [];
var playerIdCounter = 0;

////////////////////////////////////////////////////////////////////////////////

function broadcast(message, sender) {
	clients.forEach(function (client) {
		if (client === sender) return;
		client.write(message);
	});
}
function addClient(socket){
	socket.playerInfo = new PlayerInfo();
	clients.push(socket);
}
function removeClient(socket){
	clients.splice(clients.indexOf(socket), 1);	
}
function connectPlayer(sender){
	var playerId = ++playerIdCounter;
	var message = null;

	sender.playerInfo.playerId = playerId;

	// tell sender that it connected successfully
	message = bufferpack.pack(
		messageFormatByType(kNetConnectRes), 
		[kNetConnectRes]);
	sender.write(message);

	// tell everyone else that a player has connected
	message = bufferpack.pack(
		messageFormatByType(kNetRecvPlayerConnect), 
		[kNetRecvPlayerConnect, playerId]);
	broadcast(message, sender);

	console.log("[joined] playerId: " + sender.playerInfo.playerId);
}
function disconnectPlayer(sender){
	var playerId = sender.playerInfo.playerId;
	var message = null;

	// tell everyone else that a player has disconnected
	message = bufferpack.pack(
		messageFormatByType(kNetRecvPlayerDisconnect), 
		[kNetRecvPlayerDisconnect, playerId]);
	broadcast(message, sender);

	console.log("[left] playerId: " + playerId);
}
function sendServerInfo(sender){
	var message = null;

	console.log("sending server info to player " + sender.playerInfo.playerId);

	message = bufferpack.pack(
		messageFormatByType(kNetGetServerInfoRes), 
		[kNetGetServerInfoRes, kServerVersion, kServerName]);
	sender.write(message);
}
function sendPlayerInfo(sender, playerId){
	console.log("sending player info to player " + sender.playerInfo.playerId);

	// message = bufferpack.pack(
	// 	messageFormatByType(kNetGetServerInfoRes), 
	// 	[kNetGetServerInfoRes, kServerVersion, kServerName]);
	// sender.write(message);
}
function updatePlayerState(sender, unpackedMessage){
	sender.playerInfo.deserializeUpdateMessage(unpackedMessage);
}
function broadcastMessage(sender, unpackedMessage){
	unpackedMessage[0] = kNetRecvMessage;
	unpackedMessage[1] = sender.playerInfo.playerId;

	console.log("broadcasting message for player " + sender.playerId);

	var message = bufferpack.pack(
		messageFormatByType(kNetRecvMessage), 
		unpackedMessage);
	broadcast(message, sender);
}

////////////////////////////////////////////////////////////////////////////////

setInterval(function broadcastPlayerUpdates(){
	clients.forEach(function (client) {
		var message = client.playerInfo.serializeUpdateMessage();

		broadcast(message, client);
	});
}, kServerBroadcastFrequency);

////////////////////////////////////////////////////////////////////////////////

net.createServer(function (socket){
	console.log("Connecting client (" + socket.remoteAddress + ":" + socket.remotePort + ")");

	addClient(socket);

	socket.on('data', function (data){
		var offset = 0;

		// console.log("processing data...");

		while(offset < data.length){

		  	var messageData = deserializeMessageFromData(data.slice(offset));
		  	var message = messageData[0];
		  	var type = message[0];

		  	offset += messageData[1];

			// console.log("offset: " + offset);

	  		if(type == kNetConnectReq){
	  			connectPlayer(socket);
	  		}else if(type == kNetDisconnectReq){
	  			disconnectPlayer(socket);
	  		}else if(type == kNetGetServerInfoReq){
	  			sendServerInfo(socket);
	  		}else if(type == kNetGetPlayerInfoReq){
	  			sendPlayerInfo(socket);
	  		}else if(type == kNetSendPlayerUpdate){
	  			updatePlayerState(socket, message);
	  		}else if(type == kNetSendMessage){
	  			broadcastMessage(socket, message);
	  		}
		}
	});

	socket.on('end', function () {		
		console.log("Disconnecting client...");

		disconnectPlayer(socket);
		removeClient(socket);
	});

	socket.on('error', function() {
		console.log("Disconnecting client...");

		disconnectPlayer(socket);
		removeClient(socket);
	});
}).listen(5000);
 
// Put a friendly message on the terminal of the server.
console.log("Chat server running at port 5000\n");
