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

const INCOMING_BUFFER_LENGTH = 512;
const OUTGOING_BUFFER_LENGTH = 512;

const gIncomingBuffer = new ArrayBuffer(INCOMING_BUFFER_LENGTH);
const gOutgoingBuffer = new ArrayBuffer(OUTGOING_BUFFER_LENGTH);

const gIncomingBytes = new Uint8Array(gIncomingBuffer);
const gOutgoingBytes = new Uint8Array(gOutgoingBuffer);

let gIncomingIndex = 0;
let gOutgoingIndex = 0;

/**
 * Functions for reading data from the incoming buffer.
 */

function readUint8() {
  let value = gIncomingBytes[gIncomingIndex];
  gIncomingIndex = (gIncomingIndex + 1) % INCOMING_BUFFER_LENGTH;
  return value;
}

function readUint16() {
  return getUint8() << 8 | getUint8();
}

function readUint32() {
  return getUint8() << 24 | getUint8() << 16 | getUint8() << 8 | getUint8();
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


/**
 * Functions for writing data to the outgoing buffer.
 */

function writeUint8(value) {
  gOutgoingBytes[gOutgoingIndex] = value;
  gOutgoingBytes += 1;
}

function writeUint16(value) {
  writeUint8((value >> 8) & 0xff);
  writeUint8(value & 0xff);
}

function writeUint32(value) {
  writeUint8((value >> 24) & 0xff);
  writeUint8((value >> 16) & 0xff);
  writeUint8((value >> 8) & 0xff);
  writeUint8(value & 0xff);
}

function writeString(value) {
  for (let i = 0; i < value.length; i++) {
    writeUint16(value.charCodeAt(i));
  }
}


/**
 * Parcel management
 */

// State of the current packet we are accumulating in buffer.
const UINT32_SIZE = 4;
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
      if (gReadIncoming < UINT32_SIZE) {
        // We're don't know how big the next parcel is going to be, need more
        // data.
        return;
      }
      gCurrentParcelSize = readUint32();
      // The size itself is not included in the size.
      gReadIncoming -= UINT32_SIZE;
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
  let response_type = getUint32();
  if (response_type == RESPONSE_TYPE_SOLICITED) {
    let token = getUint32();
    let length = gReadIncoming - 2 * UINT32_SIZE;
    //TODO XXX dispatch callbacks here
    //
  } else if (response_type == RESPONSE_TYPE_UNSOLICITED) {
    let request_type = getUint32();
    let length = gReadIncoming - 2 * UINT32_SIZE;
    //TODO XXX dispatch callbacks here
  } else {
    dump("Unknown response type: " + response_type);
  }
}


/**
 * Communication with the RIL IPC thread.
 */

this.addEventListener("message", function onMessage(event) {
  processIncoming(event.data);
});

function sendParcel() {
  //TODO XXX this assumes that postRILMessage can eat a ArrayBufferView!
  let parcel = gOutgoingBuffer.subarray(0, gOutgoingIndex);
  postRILMessage(parcel);
  gOutgoingIndex = 0;
}
