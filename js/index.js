const sleep = (milliseconds) => {return new Promise(resolve => setTimeout(resolve, milliseconds))};
const https = require('https');
const fs = require('fs');
const ws = require('ws');
var express = require('express');
var app = express();

/*

1. Make a discord Guild (server)
2. Make a discord Bot and give it all intents (https://discord.dev)
3. Add that bot to the guild you just made

== That bot will receive PRESENCE_UPDATE event over WS when you change your status ==

*/

let token = "bot_token";
let last = "online"

const server = https.createServer({
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem')
}, app);

app.get("/", (req, res) => {
    res.sendFile(`../www/index.html`);
})

let sockets = [];

const wss = new ws.WebSocketServer({ server });

wss.on('connection', (ws) => {
    sockets.push(ws)
    ws.send(last)
    ws.close = (event) => { sockets = sockets.filter(s => s !== ws); }
});

server.listen(443);

// https://github.com/notyml/discord-ws-base
function recursion()
{
    let socket = new ws.WebSocket("wss://gateway.discord.gg/?encoding=json&v=9");
    socket.onready = function(event){
        console.log("WS Ready!")
    }

    socket.onclose = async function(event){
        console.log("Recursion!")
        recursion()
    }
    
    socket.onmessage = async function(event) {
        let ctx = JSON.parse(event.data);

        if(ctx.t == "PRESENCE_UPDATE") {
            last = ctx.d.status
            sockets.forEach(socket => {
                socket.send(last)
            })
        }

        if(ctx?.d?.heartbeat_interval!==undefined){
            var interval = JSON.parse(event.data)['d']['heartbeat_interval'];
            hb(socket, interval);
            socket.send(JSON.stringify({
                "op": 2, "d": { 
                "intents": 32767,
                "token": token,
                "properties":{
                    "os":"Linux",
                    "browser":"Firefox",
                    "device":"",
                },
                "compress":false,
                }
            }));
        };

    }
}

recursion()

async function hb(socket, interval){
    while(true){
        let hbpayload={
            'op': 1,
            'd': 'null'
        };
        socket.send(JSON.stringify(hbpayload));
        await sleep(interval);
    };
};