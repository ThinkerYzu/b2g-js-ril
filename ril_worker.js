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
 * The three objects in this file represent individual parts of this
 * communication chain:
 * 
 * - RILMessageEvent -> Buf -> RIL -> Phone -> postMessage()
 * - "message" event -> Phone -> RIL -> Buf -> postRILMessage()
 */

"use strict";

importScripts("ril_vars.js");

const DEBUG = true;

const INT32_MAX   = 2147483647;
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
  INCOMING_BUFFER_LENGTH: 4096,
  OUTGOING_BUFFER_LENGTH: 4096,

  init: function init() {
    this.incomingBuffer = new ArrayBuffer(this.INCOMING_BUFFER_LENGTH);
    this.outgoingBuffer = new ArrayBuffer(this.OUTGOING_BUFFER_LENGTH);

    this.incomingBytes = new Uint8Array(this.incomingBuffer);
    this.outgoingBytes = new Uint8Array(this.outgoingBuffer);

    // Track where incoming data is read from and written to.
    //XXX I think we could fold this into one index just like we do it
    // with outgoingIndex.
    this.incomingWriteIndex = 0;
    this.incomingReadIndex = 0;

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
    //debug("Reading at " + this.incomingReadIndex);
    let value = this.incomingBytes[this.incomingReadIndex];
    this.incomingReadIndex = (this.incomingReadIndex + 1) %
                             this.INCOMING_BUFFER_LENGTH;
    return value;
  },

  readUint16: function readUint16() {
    return this.readUint8() | this.readUint8() << 8;
  },

  readUint32: function readUint32() {
    return this.readUint8()       | this.readUint8() <<  8 |
           this.readUint8() << 16 | this.readUint8() << 24;
  },

  readUint32List: function readUint32List() {
    let length = this.readUint32();
    let ints = [];
    for (let i = 0; i < length; i++) {
      ints.push(this.readUint32());
    }
    return ints;
  },

  readString: function readString() {
    let string_len = this.readUint32();
    if (string_len < 0 || string_len >= INT32_MAX) {
      return null;
    }
    let s = "";
    for (let i = 0; i < string_len; i++) {
      s += String.fromCharCode(this.readUint16());
    }
    // Strings are \0\0 delimited, but that isn't part of the length. And
    // if the string length is even, the delimiter is two characters wide.
    // It's insane, I know.
    let delimiter = this.readUint16();
    if (!(string_len % 2)) {
      delimiter += this.readUint16();
    }
    debug("String delimiter: " + delimiter);
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
    if (value == null) {
      this.writeUint32(-1);
      return;
    }
    this.writeUint32(value.length);
    for (let i = 0; i < value.length; i++) {
      this.writeUint16(value.charCodeAt(i));
    }
    // Strings are \0\0 delimited, but that isn't part of the length. And
    // if the string length is even, the delimiter is two characters wide.
    // It's insane, I know.
    this.writeUint16(0);
    if (!(value.length % 2)) {
      this.writeUint16(0);
    }
  },

  writeStringList: function writeStringList(strings) {
    this.writeUint32(strings.length);
    for (let i = 0; i < strings.length; i++) {
      this.writeString(strings[i]);
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
   * Write incoming data to the circular buffer.
   */
  writeToIncoming: function writeToIncoming(incoming) {
    // We don't have to worry about the head catching the tail since
    // we process any backlog in parcels immediately, before writing
    // new data to the buffer. So the only edge case we need to handle
    // is when the incoming data is larger than the buffer size.
    if (incoming.length > this.INCOMING_BUFFER_LENGTH) {
      debug("Current buffer of " + this.INCOMING_BUFFER_LENGTH +
            " can't handle incoming " + incoming.length + " bytes ");
      let oldBytes = this.incomingBytes;
      while (this.INCOMING_BUFFER_LENGTH < incoming.length) {
        this.INCOMING_BUFFER_LENGTH *= 2;
      }
      this.incomingBuffer = new ArrayBuffer(this.INCOMING_BUFFER_LENGTH);
      this.incomingBytes = new Uint8Array(this.incomingBuffer);
      if (this.incomingReadIndex <= this.incomingWriteIndex) {
        // Read and write index are in natural order, so we can just copy
        // the old buffer over to the bigger one without having to worry
        // about the indexes.
        this.incomingBytes.set(oldBytes, 0);
      } else {
        // The write index has wrapped around but the read index hasn't yet.
        // Write whatever the read index has left to read until it would
        // circle around to the beginning of the new buffer, and the rest
        // behind that.
        let head = oldBytes.subarray(this.incomingReadIndex);
        let tail = oldBytes.subarray(0, this.incomingReadIndex);
        this.incomingBytes.set(head, 0);
        this.incomingBytes.set(tail, head.length);
        this.incomingReadIndex = 0;
        this.incomingWriteIndex += head.length;
      }
      debug("New incoming buffer size is " + this.INCOMING_BUFFER_LENGTH);
    }

    // We can let the typed arrays do the copying if the incoming data won't
    // wrap around the edges of the circular buffer.
    let remaining = this.INCOMING_BUFFER_LENGTH - this.incomingWriteIndex - 1;
    if (remaining >= incoming.length) {
      this.incomingBytes.set(incoming, this.incomingWriteIndex);
      this.incomingWriteIndex += incoming.length;
    } else {
      // The incoming data would wrap around it.
      let head = incoming.subarray(0, remaining);
      let tail = incoming.subarray(remaining);
      this.incomingBytes.set(head, this.incomingWriteIndex);
      this.incomingBytes.set(tail, 0);
    }
  },

  /**
   * Process incoming data.
   */
  processIncoming: function processIncoming(incoming) {
    if (DEBUG) {
      debug("Received " + incoming.length + " bytes.");
      debug("Previous buffer size is " + this.readIncoming);
    }

    this.writeToIncoming(incoming);
    this.readIncoming += incoming.length;
    while (true) {
      if (!this.currentParcelSize) {
        // We're expecting a new parcel.
        if (this.readIncoming < PARCEL_SIZE_SIZE) {
          // We're don't know how big the next parcel is going to be, need more
          // data.
          return;
        }
        this.currentParcelSize = this.readParcelSize();
        if (DEBUG) debug("New parcel, size " + this.currentParcelSize);
        // The size itself is not included in the size.
        this.readIncoming -= PARCEL_SIZE_SIZE;
      }

      if (this.readIncoming < this.currentParcelSize) {
        // We haven't read enough yet in order to be able to process a parcel.
        return;
      }

      // Alright, we have enough data to process at least one whole parcel.
      // Let's do that.
      let expectedAfterIndex = (this.incomingReadIndex + this.currentParcelSize)
                               % this.INCOMING_BUFFER_LENGTH;

      if (DEBUG) {
        let parcel;
        if (expectedAfterIndex < this.incomingReadIndex) {
          let head = this.incomingBytes.subarray(this.incomingReadIndex);
          let tail = this.incomingBytes.subarray(0, expectedAfterIndex);
          parcel = Array.slice(head).concat(Array.slice(tail));
        } else {
          parcel = Array.slice(this.incomingBytes.subarray(
            this.incomingReadIndex, expectedAfterIndex));
        }
        if (DEBUG) {
          debug("Parcel (size " + this.currentParcelSize + "): " + parcel);
        }
      }

      try {
        this.processParcel();
      } catch (ex) {
        if (DEBUG) debug("Parcel handling threw " + ex);
      }

      // Ensure that the whole parcel was consumed.
      if (this.incomingReadIndex != expectedAfterIndex) {
        if (DEBUG) {
          debug("Parcel handler didn't consume whole parcel, " +
                Math.abs(expectedAfterIndex - this.incomingReadIndex) +
                " bytes left over");
        }
        this.incomingReadIndex = expectedAfterIndex;
      }
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
      let error = this.readUint32();
      if (error) {
        //TODO
        debug("Received error " + error + " for solicited parcel type " +
              response_type);
        return;
      }
      request_type = this.tokenRequestMap[token];
      debug("Solicited response for request type " + request_type +
            ", token " + token);
      delete this.tokenRequestMap[token];
    } else if (response_type == RESPONSE_TYPE_UNSOLICITED) {
      request_type = this.readUint32();
      debug("Unsolicited response for request type " + request_type);
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
    debug("Outgoing parcel: " + Array.slice(parcel));
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
 * Provide a high-level API representing the RIL's capabilities. This is
 * where parcels are sent and received from and translated into API calls.
 * For the most part, this object is pretty boring as it simply translates
 * between method calls and RIL parcels. Somebody's gotta do the job...
 */
let RIL = {

  /**
   * Retrieve the ICC card's status.
   * 
   * Response will call Phone.onICCStatus().
   */
  getICCStatus: function getICCStatus() {
    Buf.simpleRequest(RIL_REQUEST_GET_SIM_STATUS);
  },

  /**
   * Enter a PIN to unlock the ICC.
   * 
   * Response will call Phone.onEnterSIMPIN().
   */
  enterICCPIN: function enterICCPIN(pin) {
    Buf.newParcel(RIL_REQUEST_ENTER_SIM_PIN);
    Buf.writeUint32(1);
    Buf.writeString(pin);
    Buf.sendParcel();
  },

  /**
   * Request the phone's radio power to be switched on or off.
   *
   * @param on
   *        Boolean indicating the desired power state.
   */
  setRadioPower: function setRadioPower(on) {
    Buf.newParcel(RIL_REQUEST_RADIO_POWER);
    Buf.writeUint32(1);
    Buf.writeUint32(on ? 1 : 0);
    Buf.sendParcel();
  },

  /**
   * Set screen state.
   *
   * @param on
   *        Boolean indicating whether the screen should be on or off.
   */
  setScreenState: function setScreenState(on) {
    Buf.newParcel(RIL_REQUEST_SCREEN_STATE);
    Buf.writeUint32(1);
    Buf.writeUint32(on ? 1 : 0);
    Buf.sendParcel();
  },

  /**
   * Get current calls.
   */
  getCurrentCalls: function getCurrentCalls() {
    Buf.simpleRequest(RIL_REQUEST_GET_CURRENT_CALLS);
  },

  /**
   * Get the signal strength.
   */
  getSignalStrength: function getSignalStrength() {
    Buf.simpleRequest(RIL_REQUEST_SIGNAL_STRENGTH);
  },

  getIMEI: function getIMEI() {
    Buf.simpleRequest(RIL_REQUEST_GET_IMEI);
  },

  getIMEISV: function getIMEISV() {
    Buf.simpleRequest(RIL_REQUEST_GET_IMEISV);
  },

  getDeviceIdentity: function getDeviceIdentity() {
    Buf.simpleRequest(RIL_REQUEST_GET_DEVICE_IDENTITY);
  },

  /**
   * Dial the phone.
   *
   * @param address
   *        String containing the address (number) to dial.
   * @param clirMode
   *        Integer doing something XXX TODO
   * @param uusInfo
   *        Integer doing something XXX TODO
   */
  dial: function dial(address, clirMode, uusInfo) {
    let token = Buf.newParcel(RIL_REQUEST_DIAL);
    Buf.writeString(address);
    Buf.writeUint32(clirMode || 0);
    Buf.writeUint32(uusInfo || 0);
	// TODO Why do we need this extra 0? It was put it in to make this
	// match the format of the binary message.
	Buf.writeUint32(0);
    Buf.sendParcel();
  },

  /**
   * Send an SMS.
   *
   * @param smscPDU
   *        String containing the SMSC PDU in hex format.
   * @param pdu
   *        String containing the PDU in hex format.
   */
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

  /**
   * Handle incoming requests from the RIL. We find the method that
   * corresponds to the request type. Incidentally, the request type
   * _is_ the method name, so that's easy.
   */

  handleParcel: function handleParcel(request_type, length) {
    let method = this[request_type];
    if (typeof method == "function") {
      debug("Handling parcel as " + method.name);
      method.call(this, length);
    }
  }
};

RIL[RIL_REQUEST_GET_SIM_STATUS] = function RIL_REQUEST_GET_SIM_STATUS() {
  let iccStatus = {
    cardState:                   Buf.readUint32(), // CARDSTATE_*
    universalPINState:           Buf.readUint32(), // PINSTATE_*
    gsmUmtsSubscriptionAppIndex: Buf.readUint32(),
    setCdmaSubscriptionAppIndex: Buf.readUint32(),
    apps:                        []
  };

  let apps_length = Buf.readUint32();
  if (apps_length > CARD_MAX_APPS) {
    apps_length = CARD_MAX_APPS;
  }

  for (let i = 0 ; i < apps_length ; i++) {
    iccStatus.apps.push({
      app_type:       Buf.readUint32(), // APPTYPE_*
      app_state:      Buf.readUint32(), // APPSTATE_*
      perso_substate: Buf.readUint32(), // PERSOSUBSTATE_*
      aid:            Buf.readString(),
      app_label:      Buf.readString(),
      pin1_replaced:  Buf.readUint32(),
      pin1:           Buf.readUint32(),
      pin2:           Buf.readUint32()
    });
  }
  Phone.onICCStatus(iccStatus);
};
RIL[RIL_REQUEST_ENTER_SIM_PIN] = function RIL_REQUEST_ENTER_SIM_PIN() {
  let response = Buf.readUint32List();
  Phone.onEnterICCPIN(response);
};
RIL[RIL_REQUEST_ENTER_SIM_PUK] = null;
RIL[RIL_REQUEST_ENTER_SIM_PIN2] = null;
RIL[RIL_REQUEST_ENTER_SIM_PUK2] = null;
RIL[RIL_REQUEST_CHANGE_SIM_PIN] = null;
RIL[RIL_REQUEST_CHANGE_SIM_PIN2] = null;
RIL[RIL_REQUEST_ENTER_NETWORK_DEPERSONALIZATION] = null;
RIL[RIL_REQUEST_GET_CURRENT_CALLS] = function RIL_REQUEST_GET_CURRENT_CALLS() {
  let calls = [];
  let calls_length = Buf.readUint32();
  debug("No. of current calls: " + calls_length);
/*
  for (let i = 0; i < calls_length; i++) {
    let dc = {
      state:              Buf.readUint32(), // CALLSTATE_* constants
      index:              Buf.readUint32(),
      TOA:                Buf.readUint32(),
      isMpty:             (0 != Buf.readUint32()),
      isMT:               (0 != Buf.readUint32()),
      als:                Buf.readUint32(),
      isVoice:            (0 == Buf.readUint32()) ? false : true,
      isVoicePrivacy:     (0 != Buf.readUint32()),
      number:             Buf.readString(), //TODO munge with TOA
      numberPresentation: Buf.readUint32(), // Connection.PRESENTATION XXX TODO
      name:               Buf.readString(),
      namePresentation:   Buf.readUint32(),
      uusInfo:            null
    };
    let uusInfoPresent = Buf.readUint32();
    if (uusInfoPresent == 1) {
      dc.uusInfo = {
        type:     Buf.readUint32(),
        dcs:      Buf.readUint32(),
        userData: null //XXX TODO byte array?!?
      };
    }
    calls.push(dc);
  }
*/
  Phone.onCurrentCalls(calls);
};
RIL[RIL_REQUEST_DIAL] = null;
RIL[RIL_REQUEST_GET_IMSI] = function RIL_REQUEST_GET_IMSI(length) {
  let imsi = Buf.readString(length);
  Phone.onIMSI(imsi);
};
RIL[RIL_REQUEST_HANGUP] = null;
RIL[RIL_REQUEST_HANGUP_WAITING_OR_BACKGROUND] = null;
RIL[RIL_REQUEST_HANGUP_FOREGROUND_RESUME_BACKGROUND] = null;
RIL[RIL_REQUEST_SWITCH_WAITING_OR_HOLDING_AND_ACTIVE] = null;
RIL[RIL_REQUEST_SWITCH_HOLDING_AND_ACTIVE] = null;
RIL[RIL_REQUEST_CONFERENCE] = null;
RIL[RIL_REQUEST_UDUB] = null;
RIL[RIL_REQUEST_LAST_CALL_FAIL_CAUSE] = null;
RIL[RIL_REQUEST_SIGNAL_STRENGTH] = function RIL_REQUEST_SIGNAL_STRENGTH() {
  let strength = {
    // Valid values are (0-31, 99) as defined in TS 27.007 8.5.
    gsmSignalStrength: Buf.readUint32(),
    // GSM bit error rate (0-7, 99) as defined in TS 27.007 8.5.
    gsmBitErrorRate:   Buf.readUint32(),
    // The CDMA RSSI value.
    cdmaDBM:           Buf.readUint32(),
    // The CDMA EC/IO.
    cdmaECIO:          Buf.readUint32(),
    // The EVDO RSSI value.
    evdoDBM:           Buf.readUint32(),
    // The EVDO EC/IO.
    evdoECIO:          Buf.readUint32(),
    // Valid values are 0-8.  8 is the highest signal to noise ratio
    evdoSNR:           Buf.readUint32()
  };
  Phone.onSignalStrength(strength);
};
RIL[RIL_REQUEST_REGISTRATION_STATE] = function RIL_REQUEST_REGISTRATION_STATE(length) {
  let state = Buf.readStringList();
  Phone.onRegistrationState(state);
};
RIL[RIL_REQUEST_GPRS_REGISTRATION_STATE] = function RIL_REQUEST_GPRS_REGISTRATION_STATE(length) {
  let state = Buf.readStringList();
  Phone.onGPRSRegistrationState(state);
};
RIL[RIL_REQUEST_OPERATOR] = function RIL_REQUEST_OPERATOR(length) {
  let operator = Buf.readStringList();
  Phone.onOperator(operator);
};
RIL[RIL_REQUEST_RADIO_POWER] = null;
RIL[RIL_REQUEST_DTMF] = null;
RIL[RIL_REQUEST_SEND_SMS] = function RIL_REQUEST_SEND_SMS() {
  let messageRef = Buf.readUint32();
  let ackPDU = p.readString();
  let errorCode = p.readUint32();
  Phone.onSendSMS(messageRef, ackPDU, errorCode);
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
RIL[RIL_REQUEST_GET_IMEI] = function RIL_REQUEST_GET_IMEI() {
  let imei = Buf.readString();
  Phone.onIMEI(imei);
};
RIL[RIL_REQUEST_GET_IMEISV] = function RIL_REQUEST_GET_IMEISV() {
  let imeiSV = Buf.readString();
  Phone.onIMEISV(imeiSV);
};
RIL[RIL_REQUEST_ANSWER] = null;
RIL[RIL_REQUEST_DEACTIVATE_DATA_CALL] = null;
RIL[RIL_REQUEST_QUERY_FACILITY_LOCK] = null;
RIL[RIL_REQUEST_SET_FACILITY_LOCK] = null;
RIL[RIL_REQUEST_CHANGE_BARRING_PASSWORD] = null;
RIL[RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE] = function RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE() {
  let response = Buf.readUint32List();
  Phone.onNetworkSelectionMode(response);
};
RIL[RIL_REQUEST_SET_NETWORK_SELECTION_AUTOMATIC] = null;
RIL[RIL_REQUEST_SET_NETWORK_SELECTION_MANUAL] = null;
RIL[RIL_REQUEST_QUERY_AVAILABLE_NETWORKS] = null;
RIL[RIL_REQUEST_DTMF_START] = null;
RIL[RIL_REQUEST_DTMF_STOP] = null;
RIL[RIL_REQUEST_BASEBAND_VERSION] = function RIL_REQUEST_BASEBAND_VERSION() {
  let version = Buf.readString();
  Phone.onBasebandVersion(version);
},
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
RIL[RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED] = function RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED() {
  let newState = Buf.readUint32();
  Phone.onRadioStateChanged(newState);
};
RIL[RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED] = function RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED() {
  Phone.onCallStateChanged();
};
RIL[RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED] = function RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED() {
  Phone.onNetworkStateChanged();
};
RIL[RIL_UNSOL_RESPONSE_NEW_SMS] = null;
RIL[RIL_UNSOL_RESPONSE_NEW_SMS_STATUS_REPORT] = null;
RIL[RIL_UNSOL_RESPONSE_NEW_SMS_ON_SIM] = null;
RIL[RIL_UNSOL_ON_USSD] = null;
RIL[RIL_UNSOL_ON_USSD_REQUEST] = null;
RIL[RIL_UNSOL_NITZ_TIME_RECEIVED] = null;
RIL[RIL_UNSOL_SIGNAL_STRENGTH] = function RIL_UNSOL_SIGNAL_STRENGTH() {
  this[RIL_REQUEST_SIGNAL_STRENGTH]();
};
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


/**
 * This object represents the phone's state and functionality. It is
 * essentially a state machine that's being acted upon from RIL and the
 * mainthread via postMessage communication.
 */
let Phone = {

  //XXX TODO beware, this is just demo code. It's still missing
  // communication with the UI thread.

  /**
   * One of the RADIOSTATE_* constants.
   */
  radioState: null,

  /**
   * Strings
   */
  IMEI: null,
  IMEISV: null,
  IMSI: null,

  /**
   * List of strings identifying the network operator.
   */
  operator: null,

  /**
   * String containing the baseband version.
   */
  basebandVersion: null,

  /**
   * Network selection mode. 0 for automatic, 1 for manual selection.
   */
  networkSelectionMode: null,

  /**
   * ICC card status
   */
  iccStatus: null,

  /**
   * Handlers for messages from the RIL. They all begin with on*.
   */

  onRadioStateChanged: function onRadioStateChanged(newState) {
    debug("Radio state changed from " + this.radioState + " to " + newState);
    if (this.radioState == newState) {
      // No change in state, return.
      return;
    }

    let gsm = newState == RADIOSTATE_SIM_NOT_READY        ||
              newState == RADIOSTATE_SIM_LOCKED_OR_ABSENT ||
              newState == RADIOSTATE_SIM_READY;
    let cdma = newState == RADIOSTATE_RUIM_NOT_READY       ||
               newState == RADIOSTATE_RUIM_READY            ||
               newState == RADIOSTATE_RUIM_LOCKED_OR_ABSENT ||
               newState == RADIOSTATE_NV_NOT_READY          ||
               newState == RADIOSTATE_NV_READY;

    // Figure out state transitions and send out more RIL requests as necessary
    // as well as events to the main thread.

    if (this.radioState == RADIOSTATE_UNAVAILABLE &&
        newState != RADIOSTATE_UNAVAILABLE) {
      // The radio became available, let's get its info.
      if (gsm) {
        RIL.getIMEI();
        RIL.getIMEISV();
      }
      if (cdma) {
        RIL.getDeviceIdentity();
      }
      Buf.simpleRequest(RIL_REQUEST_BASEBAND_VERSION);
      RIL.setScreenState(true);
      this.sendDOMMessage({
        type: "radiostatechange",
        radioState: (newState == RADIOSTATE_OFF) ? "off" : "ready"
      });
    }

    if (newState == RADIOSTATE_UNAVAILABLE) {
      // The radio is no longer available, we need to deal with any
      // remaining pending requests.
      //TODO do that

      this.sendDOMMessage({type: "radiostatechange",
                           radioState: "unavailable"});
    }

    if (newState == RADIOSTATE_SIM_READY  ||
        newState == RADIOSTATE_RUIM_READY ||
        newState == RADIOSTATE_NV_READY) {
      // The ICC card has become available. Get all the things.
      RIL.getICCStatus();
      this.requestNetworkInfo();
      RIL.getSignalStrength();
      this.sendDOMMessage({type: "cardstatechange",
                           cardState: "ready"});
    }
    if (newState == RADIOSTATE_SIM_LOCKED_OR_ABSENT  ||
        newState == RADIOSTATE_RUIM_LOCKED_OR_ABSENT) {
      RIL.getICCStatus();
      this.sendDOMMessage({type: "cardstatechange",
                           cardState: "unavailable"});
    }

    let wasOn = this.radioState != RADIOSTATE_OFF &&
                this.radioState != RADIOSTATE_UNAVAILABLE;
    let isOn = newState != RADIOSTATE_OFF &&
               newState != RADIOSTATE_UNAVAILABLE;
    if (!wasOn && isOn) {
      //TODO
    }
    if (wasOn && !isOn) {
      //TODO
    }

    this.radioState = newState;
  },

  onCurrentCalls: function onCurrentCalls(calls) {
    debug("onCurrentCalls");
    debug(calls);
  },

  onCallStateChanged: function onCallStateChanged() {
    RIL.getCurrentCalls();
  },

  onNetworkStateChanged: function onNetworkStateChanged() {
    debug("Network state changed, re-requesting phone state.");
    this.requestNetworkInfo();
  },

  onICCStatus: function onICCStatus(iccStatus) {
    debug("SIM card state is " + iccStatus.cardState);
    debug("Universal PIN state is " + iccStatus.universalPINState);
    debug(iccStatus);
    //TODO set to simStatus and figure out state transitions.
    this.iccStatus = iccStatus; //XXX TODO
  },

  onEnterICCPIN: function onEnterICCPIN(response) {
    debug("RIL_REQUEST_ENTER_SIM_PIN returned " + response);
    //TODO
  },

  onNetworkSelectionMode: function onNetworkSelectionMode(mode) {
    this.networkSelectionMode = mode[0];
  },

  onBasebandVersion: function onBasebandVersion(version) {
    this.basebandVersion = version;
  },

  onIMSI: function onIMSI(imsi) {
    this.IMSI = imsi;
  },

  onIMEI: function onIMEI(imei) {
    this.IMEI = imei;
  },

  onIMEISV: function onIMEISV(imeiSV) {
    this.IMEISV = imeiSV;
  },

  onRegistrationState: function onRegistrationState(newState) {
    this.registrationState = newState;
  },

  onGPRSRegistrationState: function onGPRSRegistrationState(newState) {
    this.gprsRegistrationState = newState;
  },

  onOperator: function onOperator(operator) {
    if (operator.length < 3) {
      debug("Expected at least 3 strings for operator.");
    }
    if (!this.operator ||
        this.operator.alphaLong  != operator[0] ||
        this.operator.alphaShort != operator[1] ||
        this.operator.numeric    != operator[2]) {
      this.operator = {alphaLong:  operator[0],
                       alphaShort: operator[1],
                       numeric:    operator[2]};
      this.sendDOMMessage({type: "operatorchange",
                           operator: this.operator});
    }
  },

  onSignalStrength: function onSignalStrength(strength) {
    debug("Signal strength " + JSON.stringify(strength));
    //TODO
  },

  onSendSMS: function onSendSMS(messageRef, ackPDU, errorCode) {
    //TODO
  },


  /**
   * Outgoing requests to the RIL.
   */

  /**
   * Request various states about the network.
   */
  requestNetworkInfo: function requestNetworkInfo() {
    debug("Requesting phone state");
    //TODO convert to method calls on RIL.
    Buf.simpleRequest(RIL_REQUEST_REGISTRATION_STATE);
    Buf.simpleRequest(RIL_REQUEST_GPRS_REGISTRATION_STATE);
    Buf.simpleRequest(RIL_REQUEST_OPERATOR);
    Buf.simpleRequest(RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE);
  },

  /**
   * Dial the phone.
   *
   * @param number
   *        String containing the number to dial.
   */
  dial: function dial(number) {
    RIL.dial(number, 0, 0);
  },

  /**
   * Send an SMS.
   *
   * @param number
   *        String containing the recipient number.
   * @param message
   *        String containing the message text.
   */
  sendSMS: function sendSMS(number, message) {
    //TODO munge number and message into PDU format
    let smscPDU = "";
    let pdu = "";
    RIL.sendSMS(smscPDU, pdu);
  },

  /**
   * Handle incoming messages from the main UI thread.
   * 
   * @param message
   *        Object containing the message. Messages are supposed 
   */
  handleDOMMessage: function handleMessage(message) {
    let method = this[message.method];
    if (typeof method != "function") {
      debug("Don't know what to do with message " + JSON.stringify(message));
      return;
    }
    method.apply(this, message.arguments);
  },

  /**
   * Send messages to the main UI thread.
   */
  sendDOMMessage: function sendDOMMessage(message) {
    postMessage(message, "*");
  }

};

onmessage = function onmessage(event) {
  Phone.handleDOMMessage(event.data);
};
