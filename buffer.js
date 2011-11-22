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

function readStringList() {
  let num_strings = readUint32();
  let strings = [];
  for (let i = 0; i < num_strings; i++) {
    let str_length = readUint32();
    strings.push(readString(str_length));
  }
  return strings;
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
  let length = gReadIncoming - 2 * UINT32_SIZE;

  let request_type;
  if (response_type == RESPONSE_TYPE_SOLICITED) {
    let token = readUint32();
    request_type = gTokenRequestMap[token];
  } else if (response_type == RESPONSE_TYPE_UNSOLICITED) {
    request_type = readUint32();
  } else {
    dump("Unknown response type: " + response_type);
    return;
  }

  Phone.handleParcel(request_type, length);
}


let gToken = 1;
let gTokenRequestMap = {};

function newToken() {
  return gToken++;
}

function newParcel(type) {
  // We're going to leave room for the parcel size at the beginning.
  gOutgoingIndex = PARCEL_SIZE_SIZE;
  let token = newToken();
  writeUint32(type);
  writeUint32(token);
  gTokenRequestMap[token] = type;
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

function simpleRequest(type) {
  newParcel(type);
  sendParcel();
}


/**
 * High level object representing the phone. This is where parcels are
 * sent and received from.
 */

//XXX TODO beware, this is just demo code, showing what the high level
// processing of the parcels would look like.

let Phone = {

  ril: null,
  IMEISV: null,
  IMSI: null,
  operator: null,
  IMEI: null,
  baseband_version: null,
  network_selection_mode: null,

  /**
   * Outgoing requests to the RIL.
   */

  dialPhone: function dialPhone(address, clirMode, uusInfo) {
    newParcel(RIL_REQUEST_DIAL);
    writeString(address);
    writeUint32(clirMode || 0);
    writeUint32(uusInfo || 0);
    sendParcel();
  },

  networkStateChanged: function networkStateChanged() {
    simpleRequest(RIL_REQUEST_REGISTRATION_STATE);
    simpleRequest(RIL_REQUEST_GPRS_REGISTRATION_STATE);
    simpleRequest(RIL_REQUEST_OPERATOR);
  },

  radioStateChanged: function(radioState) {
    if (radioState == RADIOSTATE_OFF) {
      newParcel(RIL_REQUEST_RADIO_POWER);
      writeUint32(1);
      writeUint32(on ? 1 : 0);
      sendParcel();
    } else {
      if (this.IMEI == null) {
        simpleRequest(RIL_REQUEST_GET_IMEI);
        this.networkStateChangedRequest();
      }
      if (this.IMEISV == null) {
        simpleRequest(RIL_REQUEST_GET_IMEISV);
      }
      if (this.baseband_version == null) {
        simpleRequest(RIL_REQUEST_BASEBAND_VERSION);
      }
    }
  },

  //TODO add moar stuff here.

  /**
   * Handle incoming requests from the RIL. We find the method that
   * corresponds to the request type. Incidentally, the request type
   * _is_ the method name, so that's easy.
   */

  handleParcel: function handleParcel(request_type, length) {
    let method = this[request_type];
    if (typeof method == "function") {
      method.call(this, length);
    }
  }
};

Phone[RIL_REQUEST_GET_SIM_STATUS] = null,
Phone[RIL_REQUEST_ENTER_SIM_PIN] = null;
Phone[RIL_REQUEST_ENTER_SIM_PUK] = null;
Phone[RIL_REQUEST_ENTER_SIM_PIN2] = null;
Phone[RIL_REQUEST_ENTER_SIM_PUK2] = null;
Phone[RIL_REQUEST_CHANGE_SIM_PIN] = null;
Phone[RIL_REQUEST_CHANGE_SIM_PIN2] = null;
Phone[RIL_REQUEST_ENTER_NETWORK_DEPERSONALIZATION] = null;
Phone[RIL_REQUEST_GET_CURRENT_CALLS] = null;
Phone[RIL_REQUEST_DIAL] = null;
Phone[RIL_REQUEST_GET_IMSI] = function RIL_REQUEST_GET_IMSI(length) {
  this.IMSI = readString(length);
  //TODO send a change event to the mainthread?
};
Phone[RIL_REQUEST_HANGUP] = null;
Phone[RIL_REQUEST_HANGUP_WAITING_OR_BACKGROUND] = null;
Phone[RIL_REQUEST_HANGUP_FOREGROUND_RESUME_BACKGROUND] = null;
Phone[RIL_REQUEST_SWITCH_WAITING_OR_HOLDING_AND_ACTIVE] = null;
Phone[RIL_REQUEST_SWITCH_HOLDING_AND_ACTIVE] = null;
Phone[RIL_REQUEST_CONFERENCE] = null;
Phone[RIL_REQUEST_UDUB] = null;
Phone[RIL_REQUEST_LAST_CALL_FAIL_CAUSE] = null;
Phone[RIL_REQUEST_SIGNAL_STRENGTH] = null;
Phone[RIL_REQUEST_REGISTRATION_STATE] = function RIL_REQUEST_REGISTRATION_STATE(length) {
  this.registrationState = readStringList();
  //TODO send a change event to the mainthread?
};
Phone[RIL_REQUEST_GPRS_REGISTRATION_STATE] = function RIL_REQUEST_GPRS_REGISTRATION_STATE(length) {
  this.gprsRegistrationState = readStringList();
  //TODO send a change event to the mainthread?
};
Phone[RIL_REQUEST_OPERATOR] = function RIL_REQUEST_OPERATOR(length) {
  this.operator = readStringList();
  //TODO send a change event to the mainthread?
};
Phone[RIL_REQUEST_RADIO_POWER] = null;
Phone[RIL_REQUEST_DTMF] = null;
Phone[RIL_REQUEST_SEND_SMS] = null;
Phone[RIL_REQUEST_SEND_SMS_EXPECT_MORE] = null;
Phone[RIL_REQUEST_SETUP_DATA_CALL] = null;
Phone[RIL_REQUEST_SIM_IO] = null;
Phone[RIL_REQUEST_SEND_USSD] = null;
Phone[RIL_REQUEST_CANCEL_USSD] = null;
Phone[RIL_REQUEST_GET_CLIR] = null;
Phone[RIL_REQUEST_SET_CLIR] = null;
Phone[RIL_REQUEST_QUERY_CALL_FORWARD_STATUS] = null;
Phone[RIL_REQUEST_SET_CALL_FORWARD] = null;
Phone[RIL_REQUEST_QUERY_CALL_WAITING] = null;
Phone[RIL_REQUEST_SET_CALL_WAITING] = null;
Phone[RIL_REQUEST_SMS_ACKNOWLEDGE] = null;
Phone[RIL_REQUEST_GET_IMEI] = function RIL_REQUEST_GET_IMEI(length) {
  this.IMEI = readString(length);
  //TODO send a change event to the mainthread?
};
Phone[RIL_REQUEST_GET_IMEISV] = null;
Phone[RIL_REQUEST_ANSWER] = null;
Phone[RIL_REQUEST_DEACTIVATE_DATA_CALL] = null;
Phone[RIL_REQUEST_QUERY_FACILITY_LOCK] = null;
Phone[RIL_REQUEST_SET_FACILITY_LOCK] = null;
Phone[RIL_REQUEST_CHANGE_BARRING_PASSWORD] = null;
Phone[RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE] = null;
Phone[RIL_REQUEST_SET_NETWORK_SELECTION_AUTOMATIC] = null;
Phone[RIL_REQUEST_SET_NETWORK_SELECTION_MANUAL] = null;
Phone[RIL_REQUEST_QUERY_AVAILABLE_NETWORKS] = null;
Phone[RIL_REQUEST_DTMF_START] = null;
Phone[RIL_REQUEST_DTMF_STOP] = null;
Phone[RIL_REQUEST_BASEBAND_VERSION] = null,
Phone[RIL_REQUEST_SEPARATE_CONNECTION] = null;
Phone[RIL_REQUEST_SET_MUTE] = null;
Phone[RIL_REQUEST_GET_MUTE] = null;
Phone[RIL_REQUEST_QUERY_CLIP] = null;
Phone[RIL_REQUEST_LAST_DATA_CALL_FAIL_CAUSE] = null;
Phone[RIL_REQUEST_DATA_CALL_LIST] = null;
Phone[RIL_REQUEST_RESET_RADIO] = null;
Phone[RIL_REQUEST_OEM_HOOK_RAW] = null;
Phone[RIL_REQUEST_OEM_HOOK_STRINGS] = null;
Phone[RIL_REQUEST_SCREEN_STATE] = null;
Phone[RIL_REQUEST_SET_SUPP_SVC_NOTIFICATION] = null;
Phone[RIL_REQUEST_WRITE_SMS_TO_SIM] = null;
Phone[RIL_REQUEST_DELETE_SMS_ON_SIM] = null;
Phone[RIL_REQUEST_SET_BAND_MODE] = null;
Phone[RIL_REQUEST_QUERY_AVAILABLE_BAND_MODE] = null;
Phone[RIL_REQUEST_STK_GET_PROFILE] = null;
Phone[RIL_REQUEST_STK_SET_PROFILE] = null;
Phone[RIL_REQUEST_STK_SEND_ENVELOPE_COMMAND] = null;
Phone[RIL_REQUEST_STK_SEND_TERMINAL_RESPONSE] = null;
Phone[RIL_REQUEST_STK_HANDLE_CALL_SETUP_REQUESTED_FROM_SIM] = null;
Phone[RIL_REQUEST_EXPLICIT_CALL_TRANSFER] = null;
Phone[RIL_REQUEST_SET_PREFERRED_NETWORK_TYPE] = null;
Phone[RIL_REQUEST_GET_PREFERRED_NETWORK_TYPE] = null;
Phone[RIL_REQUEST_GET_NEIGHBORING_CELL_IDS] = null;
Phone[RIL_REQUEST_SET_LOCATION_UPDATES] = null;
Phone[RIL_REQUEST_CDMA_SET_SUBSCRIPTION] = null;
Phone[RIL_REQUEST_CDMA_SET_ROAMING_PREFERENCE] = null;
Phone[RIL_REQUEST_CDMA_QUERY_ROAMING_PREFERENCE] = null;
Phone[RIL_REQUEST_SET_TTY_MODE] = null;
Phone[RIL_REQUEST_QUERY_TTY_MODE] = null;
Phone[RIL_REQUEST_CDMA_SET_PREFERRED_VOICE_PRIVACY_MODE] = null;
Phone[RIL_REQUEST_CDMA_QUERY_PREFERRED_VOICE_PRIVACY_MODE] = null;
Phone[RIL_REQUEST_CDMA_FLASH] = null;
Phone[RIL_REQUEST_CDMA_BURST_DTMF] = null;
Phone[RIL_REQUEST_CDMA_VALIDATE_AND_WRITE_AKEY] = null;
Phone[RIL_REQUEST_CDMA_SEND_SMS] = null;
Phone[RIL_REQUEST_CDMA_SMS_ACKNOWLEDGE] = null;
Phone[RIL_REQUEST_GSM_GET_BROADCAST_SMS_CONFIG] = null;
Phone[RIL_REQUEST_GSM_SET_BROADCAST_SMS_CONFIG] = null;
Phone[RIL_REQUEST_GSM_SMS_BROADCAST_ACTIVATION] = null;
Phone[RIL_REQUEST_CDMA_GET_BROADCAST_SMS_CONFIG] = null;
Phone[RIL_REQUEST_CDMA_SET_BROADCAST_SMS_CONFIG] = null;
Phone[RIL_REQUEST_CDMA_SMS_BROADCAST_ACTIVATION] = null;
Phone[RIL_REQUEST_CDMA_SUBSCRIPTION] = null;
Phone[RIL_REQUEST_CDMA_WRITE_SMS_TO_RUIM] = null;
Phone[RIL_REQUEST_CDMA_DELETE_SMS_ON_RUIM] = null;
Phone[RIL_REQUEST_DEVICE_IDENTITY] = null;
Phone[RIL_REQUEST_EXIT_EMERGENCY_CALLBACK_MODE] = null;
Phone[RIL_REQUEST_GET_SMSC_ADDRESS] = null;
Phone[RIL_REQUEST_SET_SMSC_ADDRESS] = null;
Phone[RIL_REQUEST_REPORT_SMS_MEMORY_STATUS] = null;
Phone[RIL_REQUEST_REPORT_STK_SERVICE_IS_RUNNING] = null;
Phone[RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED] = function RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED(length) {
  let radioState = readUint32(); //XXX I don't think this is right
  this.radioStateChanged(radioState);
};
Phone[RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED] = null;
Phone[RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED] = null;
Phone[RIL_UNSOL_RESPONSE_NEW_SMS] = null;
Phone[RIL_UNSOL_RESPONSE_NEW_SMS_STATUS_REPORT] = null;
Phone[RIL_UNSOL_RESPONSE_NEW_SMS_ON_SIM] = null;
Phone[RIL_UNSOL_ON_USSD] = null;
Phone[RIL_UNSOL_ON_USSD_REQUEST] = null;
Phone[RIL_UNSOL_NITZ_TIME_RECEIVED] = null;
Phone[RIL_UNSOL_SIGNAL_STRENGTH] = null;
Phone[RIL_UNSOL_DATA_CALL_LIST_CHANGED] = null;
Phone[RIL_UNSOL_SUPP_SVC_NOTIFICATION] = null;
Phone[RIL_UNSOL_STK_SESSION_END] = null;
Phone[RIL_UNSOL_STK_PROACTIVE_COMMAND] = null;
Phone[RIL_UNSOL_STK_EVENT_NOTIFY] = null;
Phone[RIL_UNSOL_STK_CALL_SETUP] = null;
Phone[RIL_UNSOL_SIM_SMS_STORAGE_FULL] = null;
Phone[RIL_UNSOL_SIM_REFRESH] = null;
Phone[RIL_UNSOL_CALL_RING] = null;
Phone[RIL_UNSOL_RESPONSE_SIM_STATUS_CHANGED] = null;
Phone[RIL_UNSOL_RESPONSE_CDMA_NEW_SMS] = null;
Phone[RIL_UNSOL_RESPONSE_NEW_BROADCAST_SMS] = null;
Phone[RIL_UNSOL_CDMA_RUIM_SMS_STORAGE_FULL] = null;
Phone[RIL_UNSOL_RESTRICTED_STATE_CHANGED] = null;
Phone[RIL_UNSOL_ENTER_EMERGENCY_CALLBACK_MODE] = null;
Phone[RIL_UNSOL_CDMA_CALL_WAITING] = null;
Phone[RIL_UNSOL_CDMA_OTA_PROVISION_STATUS] = null;
Phone[RIL_UNSOL_CDMA_INFO_REC] = null;
Phone[RIL_UNSOL_OEM_HOOK_RAW] = null;
Phone[RIL_UNSOL_RINGBACK_TONE] = null;
Phone[RIL_UNSOL_RESEND_INCALL_MUTE] = null;
