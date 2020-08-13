"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");

module.exports = (torrent) => {
  tracker.getPeers(torrent, (peers) => {
    peers.map((peer) => download(peer, torrent));
  });
};

const download = (peer, torrent) => {
  console.log("download", peer, torrent);
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    // 1
    socket.write(message.buildHandshake(torrent));
  });
  // 2
  onWholeMsg(socket, (msg) => {
    console.log("Got message", msg);
    msgHandler(msg, socket);
  });
};

// 2
const msgHandler = (msg, socket) => {
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
        haveHandler(m.payload);
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

chokeHandler = () => {
  //...
};

unchokeHandler = () => {
  //...
};

haveHandler = (payload) => {
  //...
};

bitfieldHandler = (payload) => {
  //...
};

pieceHandler = (payload) => {
  //...
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
