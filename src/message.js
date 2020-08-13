"use strict";

const Buffer = require("buffer").Buffer;
const torrentParser = require("./torrent-parser");

// handshake: <pstrlen><pstr><reserved><info_hash><peer_id>

//   pstrlen: string length of <pstr>, as a single raw byte
//   pstr: string identifier of the protocol
//   reserved: eight (8) reserved bytes. All current implementations use all zeroes.
//   peer_id: 20-byte string used as a unique ID for the client.

//   In version 1.0 of the BitTorrent protocol, pstrlen = 19, and pstr = "BitTorrent protocol".

module.exports.buildHandshake = (torrent) => {
  const buf = buffer.alloc(68);
  // pstrlen
  buf.writeUInt8(19, 0);
  // pstr
  buf.write("BitTorrent protocol", 1);
  // reserved
  buf.writeUInt32BE(0, 20);
  buf.writeUInt32BE(0, 24);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 28);
  // peer id
  buf.write(util.genId());
  return buf;
};

// keep - alive: <len=0000 >

// The keep - alive message is a message with zero bytes, specified with the length prefix set to zero.
// There is no message ID and no payload.Peers may close a connection if they receive no messages
// (keep - alive or any other message) for a certain period of time,
//  so a keep - alive message must be sent to maintain the connection alive if no command have been sent
// for a given amount of time. This amount of time is generally two minutes.
module.exports.buildKeepAlive = () => Buffer.alloc(4);

//choke: <len=0001><id=0>
// The choke message is fixed - length and has no payload.
module.exports.buildChoke = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(0, 4);
  return buf;
};

// unchoke: <len=0001 > <id=1 >
//   The unchoke message is fixed - length and has no payload.
module.exports.buildUnchoke = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(1, 4);
  return buf;
};
// interested: <len=0001 > <id=2 >
//   The interested message is fixed - length and has no payload.
module.exports.buildInterested = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(2, 4);
  return buf;
};

/**
 * not interested: <len=0001><id=3>
  The not interested message is fixed-length and has no payload.
 */
module.exports.buildUninterested = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(3, 4);
  return buf;
};

// have: <len=0005 > <id=4 > <piece index>
// The have message is fixed length.
// The payload is the zero-based index of a piece that has just been successfully downloaded
// and verified via the hash.
module.exports.buildHave = (pieceIdx) => {
  const buf = Buffer.alloc(9);
  // length
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(4, 4);
  // piece index
  buf.writeUInt32BE(pieceIdx, 5);
  return buf;
};

/**
 * bitfield: <len=0001+X><id=5><bitfield>

The bitfield message may only be sent immediately after the handshaking sequence is completed, 
and before any other messages are sent.
 It is optional, and need not be sent if a client has no pieces.

The bitfield message is variable length, where X is the length of the bitfield. 
The payload is a bitfield representing the pieces that have been successfully downloaded. 
The high bit in the first byte corresponds to piece index 0. 
Bits that are cleared indicated a missing piece, and set bits 
indicate a valid and available piece.
Spare bits at the end are set to zero.

A bitfield of the wrong length is considered an error.
Clients should drop the connection if they receive bitfields 
that are not of the correct size,
or if the bitfield has any of the spare bits set.
*/
module.exports.buildBitfield = (bitfield) => {
  const buf = Buffer.alloc(14);
  // length
  buf.writeUInt32BE(1 + bitfield.length, 0);
  // id
  buf.writeUInt8(5, 4);
  // bitfield
  bitfield.copy(buf, 5);
  return buf;
};

/**
 * request: <len=0013><id=6><index><begin><length>

  The request message is fixed length, and is used to request a block.
  The payload contains the following information:

    index: integer specifying the zero-based piece index
    begin: integer specifying the zero-based byte offset within the piece
    length: integer specifying the requested length.
 */
module.exports.buildRequest = (payload) => {
  const buf = Buffer.alloc(17);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(6, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // length
  buf.writeUInt32BE(payload.length, 13);
  return buf;
};

/**
 * piece: <len=0009+X><id=7><index><begin><block>

  The piece message is variable length, where X is the length of the block. The payload contains the following information:

    index: integer specifying the zero-based piece index
    begin: integer specifying the zero-based byte offset within the piece
    block: block of data, which is a subset of the piece specified by index.
 */
module.exports.buildPiece = (payload) => {
  const buf = Buffer.alloc(payload.block.length + 13);
  // length
  buf.writeUInt32BE(payload.block.length + 9, 0);
  // id
  buf.writeUInt8(7, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // block
  payload.block.copy(buf, 13);
  return buf;
};

/**
 * cancel: <len=0013><id=8><index><begin><length>

The cancel message is fixed length, and is used to cancel block requests. 
The payload is identical to that of the "request" message. 
It is typically used during "End Game" (see the Algorithms section below).
 */
module.exports.buildCancel = (payload) => {
  const buf = Buffer.alloc(17);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(8, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // length
  buf.writeUInt32BE(payload.length, 13);
  return buf;
};

/**
 * port: <len=0003><id=9><listen-port>

The port message is sent by newer versions of the Mainline that implements a DHT tracker.
 The listen port is the port this peer's DHT node is listening on. 
This peer should be inserted in the local routing table (if DHT tracker is supported).
 */
module.exports.buildPort = (payload) => {
  const buf = Buffer.alloc(7);
  // length
  buf.writeUInt32BE(3, 0);
  // id
  buf.writeUInt8(9, 4);
  // listen-port
  buf.writeUInt16BE(payload, 5);
  return buf;
};
