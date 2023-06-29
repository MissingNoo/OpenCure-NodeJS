var dgram = require("dgram");
const {
    send
} = require("process");
require("simple-enum");
rooms = [];
var server = dgram.createSocket("udp4");
var Network = Enum(
    "Move",
    "Message",
    "PlayerMoved",
    "PlayerConnect",
    "PlayerJoined",
    "PlayerDisconnect",
    "Spawn",
    "SpawnUpgrade",
    "DestroyUpgrade",
    "UpdateUpgrade",
    "Destroy",
    "HostDisconnected",
    "LobbyConnect",
    "IsHost",
    "StartGame",
    "CreateRoom",
    "ListRooms",
    "JoinRoom",
    "Disconnect"
)

function sendMessage(data, rinfo) {
    var response = JSON.stringify(data);
    server.send(response, rinfo.port, rinfo.address);
}

function sendMessageRoom(message, sendersocket, room) {
    for (var i = 0; i < rooms.length; ++i) {
        if (rooms[i]['name'] == room) {
            for (var j = 0; j < rooms[i]['players'].length; ++j) {
                if (sendersocket != rooms[i]['players'][j]['port']) {
                    sendMessage(message, {
                        address: rooms[i]['players'][j]['address'],
                        port: rooms[i]['players'][j]['port']
                    });
                }
            }
        }
    }
}

server.on("message", function (msg, rinfo) {
    var _json = JSON.parse(msg);
    switch (_json['command']) {
        case Network.CreateRoom:
            console.log("Creating room with name: " + _json['roomname'])
            rooms[rooms.length] = {
                name: _json['roomname'],
                totalplayers: 0,
                players: []
            };
            sendMessage({
                command: Network.ListRooms,
                rooms: rooms
            }, rinfo);
            break;

        case Network.ListRooms:
            sendMessage({
                command: Network.ListRooms,
                rooms: rooms
            }, rinfo);
            break;

        case Network.JoinRoom:
            var _username = _json['username'];
            var _character = _json['character'];
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room && rooms[i]['totalplayers'] < 2) {
                    rooms[i]['players'][rooms[i]['totalplayers']] = {
                        address: rinfo['address'],
                        port: rinfo['port'],
                        username: _username,
                        character: _character
                    };
                    rooms[i]['totalplayers'] += 1;
                    //console.log(String(rooms[i]['players']['socket']));
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        var ishost = false;
                        if (rooms[i]['players'][j]['port'] == rooms[i]['players'][0]['port']) {
                            _ishost = true;
                        } else {
                            _ishost = false;
                        }
                        sendMessage({
                            command: Network.JoinRoom,
                            roomname: rooms[i]['name'],
                            players: JSON.stringify(rooms[i]['players']),
                            isHost: _ishost
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                        sendMessage({
                            command: Network.ListRooms,
                            rooms: rooms
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;

        case Network.StartGame:
            var _room = _json['roomname'];
            console.log("Starting game on room:" + _room);
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.StartGame
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;

        case Network.PlayerConnect:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] != rooms[i]['players'][j]['port']) {
                            sendMessage({
                                command: Network.PlayerJoined,
                                socket: rooms[i]['players'][j]['port']
                            }, {
                                address: rooms[i]['players'][j]['address'],
                                port: rooms[i]['players'][j]['port']
                            });
                        }
                    }
                }
            }
            break;

        case Network.Move:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] != rooms[i]['players'][j]['port']) {
                            sendMessage({
                                command: Network.PlayerMoved,
                                x: _json['x'],
                                y: _json['y'],
                                sprite: _json['sprite'],
                                image_xscale: _json['image_xscale'],
                                socket: rooms[i]['players'][j]['port']
                            }, {
                                address: rooms[i]['players'][j]['address'],
                                port: rooms[i]['players'][j]['port']
                            });
                        }
                    }
                }
            }
            break;

        case Network.SpawnUpgrade:
            sendMessageRoom({
                command: Network.SpawnUpgrade,
                socket: _json['socket'],
                x: _json['x'],
                y: _json['y'],
                sprite_index: _json['sprite_index'],
                direction: _json['direction'],
                image_angle: _json['image_angle'],
                //speed : _json['speed'],
                //sendvars : _json['sendvars'],
                //upg : _json['upg'],
                upgID: _json['upgID']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.Spawn:
            sendMessageRoom({
                command: Network.Spawn,
                x: _json['x'],
                y: _json['y'],
                sendvars: _json['sendvars']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.Destroy:
            sendMessageRoom({
                command: Network.Destroy,
                enemyID: _json['enemyID']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.UpdateUpgrade:
            sendMessageRoom({
                command: Network.UpdateUpgrade,
                upgID: _json['upgID'],
                socket: _json['socket'],
                x: _json['x'],
                y: _json['y'],
                sprite_index: _json['sprite_index'],
                direction: _json['direction'],
                image_angle: _json['image_angle'],
                image_alpha: _json['image_alpha'],
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.DestroyUpgrade:
            sendMessageRoom({
                command: Network.DestroyUpgrade,
                upgID: _json['upgID'],
            }, rinfo['port'], _json['roomname']);
            break;
        
        case Network.Disconnect:
            if (rooms.length == 0) {return;}
            for (var i = 0; i < rooms.length; ++i) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rooms[i]['players'][j]['port'] == rinfo['port']) {
                            console.log("User " + String(rinfo['port']) + " disconnected");
                            rooms.splice(i, 1);
                        }                        
                    }
                }
            break;

        default:
            break;
    }

});

server.bind(64198);