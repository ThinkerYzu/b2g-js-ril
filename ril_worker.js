/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is RIL JS Worker.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Kyle Machulis <kyle@nonpolynomial.com>
 *   Philipp von Weitershausen <philipp@weitershausen.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * This file implements the RIL worker thread. It communicates with
 * the main thread to provide a high-level API to the phone's RIL
 * stack, and with the RIL IPC thread to communicate with the RIL
 * device itself. These communication channels use message events as
 * known from Web Workers:
 *
 * - postMessage()/"message" events for main thread communication
 *
 * - postRILMessage()/"RILMessageEvent" events for RIL IPC thread
 *   communication.
 *
 */

"use strict";

loadScripts("ril_vars.js");

const UINT8_SIZE  = 1;
const UINT16_SIZE = 2;
const UINT32_SIZE = 4;
const PARCEL_SIZE_SIZE = UINT32_SIZE;

const RESPONSE_TYPE_SOLICITED = 0;
const RESPONSE_TYPE_UNSOLICITED = 1;

if (!this.debug) {
  // Debugging stub that goes nowhere.
  this.debug = function debug() {};
}

/**
 * This object contains helpers buffering incoming data & deconstructing it
 * into parcels as well as buffering outgoing data & constructing parcels.
 * For that it maintains two buffers and corresponding uint8 views, indexes.
 *
 * The incoming buffer is a circular buffer where we store incoming data.
 * As soon as a complete parcel is received, it is processed right away, so
 * the buffer only needs to be large enough to hold one parcel.
 *
 * The outgoing buffer is to prepare outgoing parcels. The index is reset
 * every time a parcel is sent.
 */
let Buf = {

  //TODO review these values
  INCOMING_BUFFER_LENGTH: 2048,
  OUTGOING_BUFFER_LENGTH: 2048,

  init: function init() {
    this.incomingBuffer = new ArrayBuffer(this.INCOMING_BUFFER_LENGTH);
    this.outgoingBuffer = new ArrayBuffer(this.OUTGOING_BUFFER_LENGTH);

    this.incomingBytes = new Uint8Array(this.incomingBuffer);
    this.outgoingBytes = new Uint8Array(this.outgoingBuffer);

    // Track where incoming data is read from and written to.
    //XXX I think we could fold this into one index just like we do it
    // with outgoingIndex.
    this.incomingIndex = 0;
    this.currentByte = 0;

    // Leave room for the parcel size for outgoing parcels.
    this.outgoingIndex = PARCEL_SIZE_SIZE;

    // How many bytes we've read for this parcel so far.
    this.readIncoming = 0;

    // Size of the incoming parcel. If this is zero, we're expecting a new
    // parcel.
    this.currentParcelSize = 0;

    // This gets incremented each time we send out a parcel.
    this.token = 1;

    // Maps tokens we send out with requests to the request type, so that
    // when we get a response parcel back, we know what request it was for.
    this.tokenRequestMap = {};
  },


  /**
   * Functions for reading data from the incoming buffer.
   *
   * These are all little endian, apart from readParcelSize();
   */

  readUint8: function readUint8() {
    let value = this.incomingBytes[this.currentByte];
    this.currentByte += 1;
    if (this.currentByte > this.INCOMING_BUFFER_LENGTH) {
      throw "Read off end of parcel";
    }
    return value;
  },

  readUint16: function readUint16() {
    return this.readUint8() | this.readUint8() << 8;
  },

  readUint32: function readUint32() {
    debug("Reading at " + this.currentByte);
    return this.readUint8()       | this.readUint8() <<  8 |
           this.readUint8() << 16 | this.readUint8() << 24;
  },

  readString: function readString() {
	let string_len = this.readUint32();
    let s = "";
    for (let i = 0; i < string_len; i++) {
      s += String.fromCharCode(this.readUint16());
    }
    return s;
  },

  readStringList: function readStringList() {
    let num_strings = this.readUint32();
    let strings = [];
    for (let i = 0; i < num_strings; i++) {
      strings.push(this.readString());
    }
    return strings;
  },

  readParcelSize: function readParcelSize() {
    return this.readUint8() << 24 | this.readUint8() << 16 |
           this.readUint8() <<  8 | this.readUint8();
  },

  /**
   * Functions for writing data to the outgoing buffer.
   */

  writeUint8: function writeUint8(value) {
    this.outgoingBytes[this.outgoingIndex] = value;
    this.outgoingIndex += 1;
  },

  writeUint16: function writeUint16(value) {
    this.writeUint8(value & 0xff);
    this.writeUint8((value >> 8) & 0xff);
  },

  writeUint32: function writeUint32(value) {
    this.writeUint8(value & 0xff);
    this.writeUint8((value >> 8) & 0xff);
    this.writeUint8((value >> 16) & 0xff);
    this.writeUint8((value >> 24) & 0xff);
  },

  writeString: function writeString(value) {
    this.writeUint32(value.length);
    for (let i = 0; i < value.length; i++) {
      this.writeUint16(value.charCodeAt(i));
    }
  },

  writeParcelSize: function writeParcelSize(value) {
    /**
     *  Parcel size will always be the first thing in the parcel byte
     *  array, but the last thing written. Store the current index off
     *  to a temporary to be reset after we write the size.
     */
    let currentIndex = this.outgoingIndex;
    this.outgoingIndex = 0;
    this.writeUint8((value >> 24) & 0xff);
    this.writeUint8((value >> 16) & 0xff);
    this.writeUint8((value >> 8) & 0xff);
    this.writeUint8(value & 0xff);
    this.outgoingIndex = currentIndex;
  },


  /**
   * Parcel management
   */

  /**
   * Write data to the circular buffer.
   */
  writeToIncoming: function writeToIncoming(incoming) {
    if (incoming.length > this.INCOMING_BUFFER_LENGTH) {
      //TODO grow the RIL buffer here and memcpy the old one over
      debug("Uh-oh. " + incoming.length + " bytes is too much for my little " +
            "short term memory.");
    }

    // We can let the typed arrays do the copying if the incoming data won't
    // wrap around the edges of the circular buffer.
    if (this.incomingIndex + incoming.length < this.INCOMING_BUFFER_LENGTH) {
      this.incomingBytes.set(incoming, this.incomingIndex);
      this.incomingIndex += incoming.length;
      return;
    }

    for (let i = 0; i < incoming.length; i++) {
      let index = (this.incomingIndex + i) % INCOMING_BUFFER_LENGTH;
      this.incomingBytes[index] = incoming[i];
    }
  },

  /**
   * Process incoming data.
   */
  processIncoming: function processIncoming(incoming) {
    this.writeToIncoming(incoming);
    this.readIncoming += incoming.length;
    while (true) {
      debug("Read Incoming: " + this.readIncoming);
      if (!this.currentParcelSize) {
        // We're expecting a new parcel.
        if (this.readIncoming < PARCEL_SIZE_SIZE) {
          // We're don't know how big the next parcel is going to be, need more
          // data.
          return;
        }
        this.currentParcelSize = this.readParcelSize();
        // The size itself is not included in the size.
        this.readIncoming -= PARCEL_SIZE_SIZE;
      }

      if (this.readIncoming < this.currentParcelSize) {
        // We haven't read enough yet in order to be able to process a parcel.
        return;
      }

      // Alright, we have enough data to process at least one whole parcel.
      // Let's do that.
      this.processParcel();

      // Ensure that the whole parcel was consumed.
      if (this.incomingIndex != this.currentByte) {
        debug("Parcel handling code did not consume the right amount of data! " +
              "Expected: " + this.currentByte + " Actual: " + this.incomingIndex);
      }
      this.currentByte = 0;
      this.incomingIndex = 0;
      this.readIncoming -= this.currentParcelSize;
      this.currentParcelSize = 0;
    }
  },

  /**
   * Process one parcel.
   */

  processParcel: function processParcel() {
    let response_type = this.readUint32();
    let length = this.readIncoming - 2 * UINT32_SIZE;

    let request_type;
    if (response_type == RESPONSE_TYPE_SOLICITED) {
      let token = this.readUint32();
      request_type = this.tokenRequestMap[token];
      delete this.tokenRequestMap[token];
    } else if (response_type == RESPONSE_TYPE_UNSOLICITED) {
      request_type = this.readUint32();
    } else {
      debug("Unknown response type: " + response_type);
      return;
    }

    RIL.handleParcel(request_type, length);
  },

  newParcel: function newParcel(type) {
    // We're going to leave room for the parcel size at the beginning.
    this.outgoingIndex = PARCEL_SIZE_SIZE;
    this.writeUint32(type);
    let token = this.token;
    this.writeUint32(token);
    this.tokenRequestMap[token] = type;
    this.token += 1;
    return token;
  },

  /**
   * Communication with the RIL IPC thread.
   */

  sendParcel: function sendParcel() {
    // Compute the size of the parcel and write it to the front of the parcel
    // where we left room for it. Note that he parcel size does not include
    // the size itself.
    let parcelSize = this.outgoingIndex - PARCEL_SIZE_SIZE;
    this.writeParcelSize(parcelSize);

    //TODO XXX this assumes that postRILMessage can eat a ArrayBufferView!
    // It also assumes that it will make a copy of the ArrayBufferView right
    // away.
    let parcel = this.outgoingBytes.subarray(0, this.outgoingIndex);
    postRILMessage(parcel);
    this.outgoingIndex = PARCEL_SIZE_SIZE;
  },

  simpleRequest: function simpleRequest(type) {
    this.newParcel(type);
    this.sendParcel();
  }
};

Buf.init();

addEventListener("RILMessageEvent", function onRILMessageEvent(event) {
  Buf.processIncoming(event.data);
});


/**
 * High level object representing the phone's RIL. This is where parcels are
 * sent and received from.
 */
let RIL = {

  //XXX TODO beware, this is just demo code, showing what the high level
  // processing of the parcels would look like. It's still missing
  // communication with the UI thread.

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
    let token = Buf.newParcel(RIL_REQUEST_DIAL);
    Buf.writeString(address);
    Buf.writeUint32(clirMode || 0);
    Buf.writeUint32(uusInfo || 0);
	// TODO Why do we need this extra 0? It was put it in to make this
	// match the format of the binary message.
	Buf.writeUint32(0);
    Buf.sendParcel();
  },

  sendSMS: function sendSMS(smscPDU, pdu) {
    let token = Buf.newParcel(RIL_REQUEST_SEND_SMS);
    //TODO we want to map token to the input values so that on the
    // response from the RIL device we know which SMS request was successful
    // or not. Maybe we should build that functionality into newParcel() and
    // handle it within tokenRequestMap[].
    Buf.writeUint32(2);
    Buf.writeString(smscPDU);
    Buf.writeString(pdu);
    Buf.sendParcel();
  },

  networkStateChanged: function networkStateChanged() {
    Buf.simpleRequest(RIL_REQUEST_REGISTRATION_STATE);
    Buf.simpleRequest(RIL_REQUEST_GPRS_REGISTRATION_STATE);
    Buf.simpleRequest(RIL_REQUEST_OPERATOR);
  },

  radioStateChanged: function(radioState) {
    if (radioState == RADIOSTATE_OFF) {
	  debug("Turning radio on");
      Buf.newParcel(RIL_REQUEST_RADIO_POWER);
      Buf.writeUint32(1);
      Buf.writeUint32(1); //TODO this should be something like "on ? 1 : 0"
      Buf.sendParcel();
    } else {
      if (this.IMEI == null) {
        Buf.simpleRequest(RIL_REQUEST_GET_IMEI);
        this.networkStateChangedRequest();
      }
      if (this.IMEISV == null) {
        Buf.simpleRequest(RIL_REQUEST_GET_IMEISV);
      }
      if (this.baseband_version == null) {
        Buf.simpleRequest(RIL_REQUEST_BASEBAND_VERSION);
      }
    }
  },

  //TODO add moar stuff here.


  /**
   * Handle incoming messages from the main UI thread.
   */
  handleMessage: function handleMessage(message) {
    //TODO
  },

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

RIL[RIL_REQUEST_GET_SIM_STATUS] = null,
RIL[RIL_REQUEST_ENTER_SIM_PIN] = null;
RIL[RIL_REQUEST_ENTER_SIM_PUK] = null;
RIL[RIL_REQUEST_ENTER_SIM_PIN2] = null;
RIL[RIL_REQUEST_ENTER_SIM_PUK2] = null;
RIL[RIL_REQUEST_CHANGE_SIM_PIN] = null;
RIL[RIL_REQUEST_CHANGE_SIM_PIN2] = null;
RIL[RIL_REQUEST_ENTER_NETWORK_DEPERSONALIZATION] = null;
RIL[RIL_REQUEST_GET_CURRENT_CALLS] = null;
RIL[RIL_REQUEST_DIAL] = null;
RIL[RIL_REQUEST_GET_IMSI] = function RIL_REQUEST_GET_IMSI(length) {
  this.IMSI = Buf.readString(length);
  //TODO send a change event to the mainthread?
};
RIL[RIL_REQUEST_HANGUP] = null;
RIL[RIL_REQUEST_HANGUP_WAITING_OR_BACKGROUND] = null;
RIL[RIL_REQUEST_HANGUP_FOREGROUND_RESUME_BACKGROUND] = null;
RIL[RIL_REQUEST_SWITCH_WAITING_OR_HOLDING_AND_ACTIVE] = null;
RIL[RIL_REQUEST_SWITCH_HOLDING_AND_ACTIVE] = null;
RIL[RIL_REQUEST_CONFERENCE] = null;
RIL[RIL_REQUEST_UDUB] = null;
RIL[RIL_REQUEST_LAST_CALL_FAIL_CAUSE] = null;
RIL[RIL_REQUEST_SIGNAL_STRENGTH] = null;
RIL[RIL_REQUEST_REGISTRATION_STATE] = function RIL_REQUEST_REGISTRATION_STATE(length) {
  this.registrationState = Buf.readStringList();
  //TODO send a change event to the mainthread?
};
RIL[RIL_REQUEST_GPRS_REGISTRATION_STATE] = function RIL_REQUEST_GPRS_REGISTRATION_STATE(length) {
  this.gprsRegistrationState = Buf.readStringList();
  //TODO send a change event to the mainthread?
};
RIL[RIL_REQUEST_OPERATOR] = function RIL_REQUEST_OPERATOR(length) {
  this.operator = Buf.readStringList();
  //TODO send a change event to the mainthread?
};
RIL[RIL_REQUEST_RADIO_POWER] = null;
RIL[RIL_REQUEST_DTMF] = null;
RIL[RIL_REQUEST_SEND_SMS] = function RIL_REQUEST_SEND_SMS() {
  let messageRef = Buf.readUint32();
  let ackPDU = p.readString();
  let errorCode = p.readUint32();
  //TODO send an event to the mainthread
};
RIL[RIL_REQUEST_SEND_SMS_EXPECT_MORE] = null;
RIL[RIL_REQUEST_SETUP_DATA_CALL] = null;
RIL[RIL_REQUEST_SIM_IO] = null;
RIL[RIL_REQUEST_SEND_USSD] = null;
RIL[RIL_REQUEST_CANCEL_USSD] = null;
RIL[RIL_REQUEST_GET_CLIR] = null;
RIL[RIL_REQUEST_SET_CLIR] = null;
RIL[RIL_REQUEST_QUERY_CALL_FORWARD_STATUS] = null;
RIL[RIL_REQUEST_SET_CALL_FORWARD] = null;
RIL[RIL_REQUEST_QUERY_CALL_WAITING] = null;
RIL[RIL_REQUEST_SET_CALL_WAITING] = null;
RIL[RIL_REQUEST_SMS_ACKNOWLEDGE] = null;
RIL[RIL_REQUEST_GET_IMEI] = function RIL_REQUEST_GET_IMEI(length) {
  this.IMEI = Buf.readString(length);
  //TODO send a change event to the mainthread?
};
RIL[RIL_REQUEST_GET_IMEISV] = null;
RIL[RIL_REQUEST_ANSWER] = null;
RIL[RIL_REQUEST_DEACTIVATE_DATA_CALL] = null;
RIL[RIL_REQUEST_QUERY_FACILITY_LOCK] = null;
RIL[RIL_REQUEST_SET_FACILITY_LOCK] = null;
RIL[RIL_REQUEST_CHANGE_BARRING_PASSWORD] = null;
RIL[RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE] = null;
RIL[RIL_REQUEST_SET_NETWORK_SELECTION_AUTOMATIC] = null;
RIL[RIL_REQUEST_SET_NETWORK_SELECTION_MANUAL] = null;
RIL[RIL_REQUEST_QUERY_AVAILABLE_NETWORKS] = null;
RIL[RIL_REQUEST_DTMF_START] = null;
RIL[RIL_REQUEST_DTMF_STOP] = null;
RIL[RIL_REQUEST_BASEBAND_VERSION] = null,
RIL[RIL_REQUEST_SEPARATE_CONNECTION] = null;
RIL[RIL_REQUEST_SET_MUTE] = null;
RIL[RIL_REQUEST_GET_MUTE] = null;
RIL[RIL_REQUEST_QUERY_CLIP] = null;
RIL[RIL_REQUEST_LAST_DATA_CALL_FAIL_CAUSE] = null;
RIL[RIL_REQUEST_DATA_CALL_LIST] = null;
RIL[RIL_REQUEST_RESET_RADIO] = null;
RIL[RIL_REQUEST_OEM_HOOK_RAW] = null;
RIL[RIL_REQUEST_OEM_HOOK_STRINGS] = null;
RIL[RIL_REQUEST_SCREEN_STATE] = null;
RIL[RIL_REQUEST_SET_SUPP_SVC_NOTIFICATION] = null;
RIL[RIL_REQUEST_WRITE_SMS_TO_SIM] = null;
RIL[RIL_REQUEST_DELETE_SMS_ON_SIM] = null;
RIL[RIL_REQUEST_SET_BAND_MODE] = null;
RIL[RIL_REQUEST_QUERY_AVAILABLE_BAND_MODE] = null;
RIL[RIL_REQUEST_STK_GET_PROFILE] = null;
RIL[RIL_REQUEST_STK_SET_PROFILE] = null;
RIL[RIL_REQUEST_STK_SEND_ENVELOPE_COMMAND] = null;
RIL[RIL_REQUEST_STK_SEND_TERMINAL_RESPONSE] = null;
RIL[RIL_REQUEST_STK_HANDLE_CALL_SETUP_REQUESTED_FROM_SIM] = null;
RIL[RIL_REQUEST_EXPLICIT_CALL_TRANSFER] = null;
RIL[RIL_REQUEST_SET_PREFERRED_NETWORK_TYPE] = null;
RIL[RIL_REQUEST_GET_PREFERRED_NETWORK_TYPE] = null;
RIL[RIL_REQUEST_GET_NEIGHBORING_CELL_IDS] = null;
RIL[RIL_REQUEST_SET_LOCATION_UPDATES] = null;
RIL[RIL_REQUEST_CDMA_SET_SUBSCRIPTION] = null;
RIL[RIL_REQUEST_CDMA_SET_ROAMING_PREFERENCE] = null;
RIL[RIL_REQUEST_CDMA_QUERY_ROAMING_PREFERENCE] = null;
RIL[RIL_REQUEST_SET_TTY_MODE] = null;
RIL[RIL_REQUEST_QUERY_TTY_MODE] = null;
RIL[RIL_REQUEST_CDMA_SET_PREFERRED_VOICE_PRIVACY_MODE] = null;
RIL[RIL_REQUEST_CDMA_QUERY_PREFERRED_VOICE_PRIVACY_MODE] = null;
RIL[RIL_REQUEST_CDMA_FLASH] = null;
RIL[RIL_REQUEST_CDMA_BURST_DTMF] = null;
RIL[RIL_REQUEST_CDMA_VALIDATE_AND_WRITE_AKEY] = null;
RIL[RIL_REQUEST_CDMA_SEND_SMS] = null;
RIL[RIL_REQUEST_CDMA_SMS_ACKNOWLEDGE] = null;
RIL[RIL_REQUEST_GSM_GET_BROADCAST_SMS_CONFIG] = null;
RIL[RIL_REQUEST_GSM_SET_BROADCAST_SMS_CONFIG] = null;
RIL[RIL_REQUEST_GSM_SMS_BROADCAST_ACTIVATION] = null;
RIL[RIL_REQUEST_CDMA_GET_BROADCAST_SMS_CONFIG] = null;
RIL[RIL_REQUEST_CDMA_SET_BROADCAST_SMS_CONFIG] = null;
RIL[RIL_REQUEST_CDMA_SMS_BROADCAST_ACTIVATION] = null;
RIL[RIL_REQUEST_CDMA_SUBSCRIPTION] = null;
RIL[RIL_REQUEST_CDMA_WRITE_SMS_TO_RUIM] = null;
RIL[RIL_REQUEST_CDMA_DELETE_SMS_ON_RUIM] = null;
RIL[RIL_REQUEST_DEVICE_IDENTITY] = null;
RIL[RIL_REQUEST_EXIT_EMERGENCY_CALLBACK_MODE] = null;
RIL[RIL_REQUEST_GET_SMSC_ADDRESS] = null;
RIL[RIL_REQUEST_SET_SMSC_ADDRESS] = null;
RIL[RIL_REQUEST_REPORT_SMS_MEMORY_STATUS] = null;
RIL[RIL_REQUEST_REPORT_STK_SERVICE_IS_RUNNING] = null;
RIL[RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED] = function RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED(length) {
  let radioState = Buf.readUint32(); //XXX I don't think this is right
  this.radioStateChanged(radioState);
};
RIL[RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED] = null;
RIL[RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED] = null;
RIL[RIL_UNSOL_RESPONSE_NEW_SMS] = null;
RIL[RIL_UNSOL_RESPONSE_NEW_SMS_STATUS_REPORT] = null;
RIL[RIL_UNSOL_RESPONSE_NEW_SMS_ON_SIM] = null;
RIL[RIL_UNSOL_ON_USSD] = null;
RIL[RIL_UNSOL_ON_USSD_REQUEST] = null;
RIL[RIL_UNSOL_NITZ_TIME_RECEIVED] = null;
RIL[RIL_UNSOL_SIGNAL_STRENGTH] = null;
RIL[RIL_UNSOL_DATA_CALL_LIST_CHANGED] = null;
RIL[RIL_UNSOL_SUPP_SVC_NOTIFICATION] = null;
RIL[RIL_UNSOL_STK_SESSION_END] = null;
RIL[RIL_UNSOL_STK_PROACTIVE_COMMAND] = null;
RIL[RIL_UNSOL_STK_EVENT_NOTIFY] = null;
RIL[RIL_UNSOL_STK_CALL_SETUP] = null;
RIL[RIL_UNSOL_SIM_SMS_STORAGE_FULL] = null;
RIL[RIL_UNSOL_SIM_REFRESH] = null;
RIL[RIL_UNSOL_CALL_RING] = null;
RIL[RIL_UNSOL_RESPONSE_SIM_STATUS_CHANGED] = null;
RIL[RIL_UNSOL_RESPONSE_CDMA_NEW_SMS] = null;
RIL[RIL_UNSOL_RESPONSE_NEW_BROADCAST_SMS] = null;
RIL[RIL_UNSOL_CDMA_RUIM_SMS_STORAGE_FULL] = null;
RIL[RIL_UNSOL_RESTRICTED_STATE_CHANGED] = null;
RIL[RIL_UNSOL_ENTER_EMERGENCY_CALLBACK_MODE] = null;
RIL[RIL_UNSOL_CDMA_CALL_WAITING] = null;
RIL[RIL_UNSOL_CDMA_OTA_PROVISION_STATUS] = null;
RIL[RIL_UNSOL_CDMA_INFO_REC] = null;
RIL[RIL_UNSOL_OEM_HOOK_RAW] = null;
RIL[RIL_UNSOL_RINGBACK_TONE] = null;
RIL[RIL_UNSOL_RESEND_INCALL_MUTE] = null;


onmessage = function onmessage(event) {
  RIL.handleMessage(event.data);
};
