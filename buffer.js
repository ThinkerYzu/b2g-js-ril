"use strict";

/**
 * Two buffers and corresponding lengths, uint8 views, and indexes.
 * 
 * The incoming buffer is a circular buffer where we store incoming data.
 * As soon as a complete parcel is received, it is processed right away, so
 * the buffer only needs to be large enough to hold one parcel.
 * 
 * The outgoing buffer is to prepare outgoing parcels. The index is reset
 * every time a parcel is sent.
 */

const UINT8_SIZE  = 1;
const UINT16_SIZE = 2;
const UINT32_SIZE = 4;
const PARCEL_SIZE_SIZE = UINT32_SIZE;

//TODO review these values
const INCOMING_BUFFER_LENGTH = 2048;
const OUTGOING_BUFFER_LENGTH = 2048;

const gIncomingBuffer = new ArrayBuffer(INCOMING_BUFFER_LENGTH);
const gOutgoingBuffer = new ArrayBuffer(OUTGOING_BUFFER_LENGTH);

const gIncomingBytes = new Uint8Array(gIncomingBuffer);
const gOutgoingBytes = new Uint8Array(gOutgoingBuffer);

// Leave room for the parcel size for outgoing parcels.
let gIncomingIndex = 0;
let gOutgoingIndex = PARCEL_SIZE_SIZE;
function reset() {
  gIncomingIndex = 0;
  gOutgoingIndex = PARCEL_SIZe_SIZE;
}


/**
 * Functions for reading data from the incoming buffer.
 * 
 * These are all little endian, apart from readParcelSize();
 */

function readUint8() {
  let value = gIncomingBytes[gIncomingIndex];
  gIncomingIndex = (gIncomingIndex + 1) % INCOMING_BUFFER_LENGTH;
  return value;
}

function readUint16() {
  return readUint8() | readUint8() << 8;
}

function readUint32() {
  return readUint8() | readUint8() << 8 | readUint8() << 16 | readUint8() << 24;
}

function readString(byte_length) {
  if (byte_length % 2) {
    throw "String length must be multiple of 2.";
  }
  let s = "";
  for (let i = 0; i < byte_length / 2; i++) {
    s += String.fromCharCode(readUint16());
  }
  return s;
}

function readParcelSize() {
  return getUint8() << 24 | getUint8() << 16 | getUint8() << 8 | getUint8();
}

/**
 * Functions for writing data to the outgoing buffer.
 */

function writeUint8(value) {
  gOutgoingBytes[gOutgoingIndex] = value;
  gOutgoingBytes += 1;
}

function writeUint16(value) {
  writeUint8(value & 0xff);
  writeUint8((value >> 8) & 0xff);
}

function writeUint32(value) {
  writeUint8(value & 0xff);
  writeUint8((value >> 8) & 0xff);
  writeUint8((value >> 16) & 0xff);
  writeUint8((value >> 24) & 0xff);
}

function writeString(value) {
  for (let i = 0; i < value.length; i++) {
    writeUint16(value.charCodeAt(i));
  }
}

function writeParcelSize(value) {
  writeUint8((value >> 24) & 0xff);
  writeUint8((value >> 16) & 0xff);
  writeUint8((value >> 8) & 0xff);
  writeUint8(value & 0xff);
}


/**
 * Parcel management
 */

// How many bytes we've read for this parcel so far.
let gReadIncoming = 0;
// Size of the incoming parcel. If this is zero, we're expecting a new parcel.
let gCurrentParcelSize = 0;

/**
 * Write data to the circular buffer.
 */
function writeToIncoming(incoming) {
  if (incoming.length > INCOMING_BUFFER_LENGTH) {
    dump("Uh-oh. " + incoming.length + " bytes is too much for my little " +
         "short term memory.");
  }

  // We can let the typed arrays do the copying if the incoming data won't
  // wrap around the edges of the circular buffer.
  if (gIncomingIndex + incoming.length < INCOMING_BUFFER_LENGTH) {
    gIncomingBytes.set(incoming, gIncomingIndex);
    gIncomingIndex += incoming.length;
    return;
  }

  for (let i = 0; i < incoming.length; i++) {
    let index = (gIncomingIndex + i) % INCOMING_BUFFER_LENGTH;
    gIncomingBytes[index] = incoming[i];
  }
}

/**
 * Process incoming data.
 */
function processIncoming(incoming) {
  writeToIncoming(buffer);
  gReadIncoming += buffer.length;

  while (true) {
    if (!gCurrentParcelSize) {
      // We're expecting a new parcel.
      if (gReadIncoming < PARCEL_SIZE_SIZE) {
        // We're don't know how big the next parcel is going to be, need more
        // data.
        return;
      }
      gCurrentParcelSize = readParcelSize();
      // The size itself is not included in the size.
      gReadIncoming -= PARCEL_SIZE_SIZE;
    }

    if (gReadIncoming < gCurrentParcelSize) {
      // We haven't read enough yet in order to be able to process a parcel.
      return;
    }

    // Alright, we have enough data to process at least one whole parcel.
    // Let's do that.
    let before = gIncomingIndex;
    processParcel();

    // Ensure that the whole parcel was consumed.
    let expectedIndex = (before + gNextParcelsize) % INCOMING_BUFFER_LENGTH;
    if (gIncomingIndex != expectedIndex) {
      dump("Parcel handling code did not consume the right amount of data! " +
           "Expected: " + expectedIndex + " Actual: " + gIncomingIndex);
      gIncomingIndex = expectedIndex;
    }

    gReadIncoming -= gCurrentParcelSize;
    gCurrentParcelSize = 0;
  }
}

/**
 * Process one parcel.
 */
const RESPONSE_TYPE_SOLICITED = 0;
const RESPONSE_TYPE_UNSOLICITED = 1;  

function processParcel() {
  let response_type = readUint32();
  if (response_type == RESPONSE_TYPE_SOLICITED) {
    let token = readUint32();
    let length = gReadIncoming - 2 * UINT32_SIZE;
    //TODO XXX dispatch callbacks here
    //
  } else if (response_type == RESPONSE_TYPE_UNSOLICITED) {
    let request_type = readUint32();
    let length = gReadIncoming - 2 * UINT32_SIZE;
    //TODO XXX dispatch callbacks here
  } else {
    dump("Unknown response type: " + response_type);
  }
}


let gToken = 1;
function newToken() {
  return gToken++;
}
function newParcel(type) {
  // We're going to leave room for the parcel size at the beginning.
  gOutgoingIndex = PARCEL_SIZE_SIZE;
  let token = newToken();
  writeUint32(type);
  writeUint32(token);
  //TODO remember token -> type mapping
  return token;
}

/**
 * Communication with the RIL IPC thread.
 */

this.addEventListener("message", function onMessage(event) {
  processIncoming(event.data);
});

function sendParcel() {
  // Compute the size of the parcel and write it to the front of the parcel
  // where we left room for it. Note that he parcel size does not include the
  // size itself.
  let parcelSize = gOutgoingIndex - PARCEL_SIZE_SIZE;
  gOutgoingIndex = 0;
  writeParcelSize(parcelSize);

  //TODO XXX this assumes that postRILMessage can eat a ArrayBufferView!
  let parcel = gOutgoingBuffer.subarray(0, gOutgoingIndex);
  postRILMessage(parcel);

  gOutgoingIndex = PARCEL_SIZE_SIZE;
}
