"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");
const Pieces = require('./Pieces');

module.exports = (torrent) => {
  const requested = [];
  tracker.getPeers(torrent, (peers) => {
    peers.map((peer) => download(peer, torrent, requested));
  });
};

const download = (peer, torrent, requested) => {
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    // 1
    socket.write(message.buildHandshake(torrent));
  });
  // 2
  const queue = [];
  onWholeMsg(socket, (msg) => {
    msgHandler(msg, socket, requested);
  });
};

const haveHandler = (payload, socket, requested) => {
  const pieceIndex = payload.readInt32BE(0);
  if (!requested[pieceIndex]) {
    socket.write(message.buildRequest(/* ... */));
  }
  requested[pieceIndex] = true;
};

const bitfieldHandler = (payload) => {
  //...
};

const pieceHandler = (payload, socket, requested, queue) => {
  queue.shift();
  requestPiece(socket, requested, queue);
};

const requestPiece = (socket, requested, queue) {
  if(requested[queue[0]]) {
    queue.shift();
  } else {
    
  }
}

const chokeHandler = () => {
  //...
};

const unchokeHandler = () => {
  //...
};

// 2
const msgHandler = (msg, socket, requested) => {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    switch (m.id) {
      case 0:
        chokeHandler();
        break;
      case 1:
        unchokeHandler();
        break;
      case 4:
        haveHandler(m.payload, socket, requested);
        break;
      case 5:
        bitfieldHandler(m.payload);
        break;
      case 7:
        pieceHandler(m.payload);
        break;
    }
  }
};

// 3
const isHandshake = (msg) => {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString("utf8", 1) === "BitTorrent protocol"
  );
};

const onWholeMsg = (socket, callback) => {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;
  socket.on("data", (recvBuf) => {
    // msgLen calculated the length of a whole message
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
};
