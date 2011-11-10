/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var RILManager = (function() {
  const RESPONSE_SOLICITED = 0;
  const RESPONSE_UNSOLICITED = 1;  

  function get32(packet, offset) {
    var x = packet.charCodeAt(offset + 0);
    x <<= 8;
    x |= packet.charCodeAt(offset + 1);
    x <<= 8;
    x |= packet.charCodeAt(offset + 2);
    x <<= 8;
    x |= packet.charCodeAt(offset + 3);
    return x;
  }

  const REQUEST_REGISTRATION_STATE = 20;
  const REQUEST_GPRS_REGISTRATION_STATE = 21;
  const REQUEST_OPERATOR = 22;
  const REQUEST_SCREEN_STATE = 61;

  // List of packets waiting for confirmation by libril.
  var outstanding = [];

  // Counter to generate outgoing tokens.
  var tokenGen = 1;

  var dispatch = {
    1000: function UNSOL_RESPONSE_RADIO_STATE_CHANGE(data) {
      var state = get32(data, 0);
    },
    1002: function UNSOL_RESPONSE_NETWORK_STATE_CHANGE(data) {
      request(REQUEST_REGISTRATION_STATE);
      request(REQUEST_GPRS_REGISTRATION_STATE);
      request(REQUEST_OPERATOR);
    }
  };

  // Handle unknown incoming packets
  function unknown(data) {
  }

  function send(packet) {
    // send packet
  }

  function request(type, a, b) {
    var packet = "";

    function put32(x) {
      packet += String.fromCharCode((x >> 24) & 0xff);
      packet += String.fromCharCode((x >> 16) & 0xff);
      packet += String.fromCharCode((x >> 8) & 0xff);
      packet += String.fromCharCode(x & 0xff);
    }

    put32(type);
    put32(tokenGen);
    for (var n = 1; n < arguments.length; ++n)
      put32(arguments[n]);
    outstanding[tokenGen++] = packet;
    send(packet);
  }

  return {
    setScreenState: function(state) {
      request(REQUEST_SCREEN_STATE, 1, state);
    },
    process: function(packet) {
      // Remove packets from the outstanding packet queue as we get a
      // confirmation from libril.
      if (get32(packet, 0) == RESPONSE_SOLICITED) {
        delete outstanding(get32(packet, 4));
        return;
      }

      // Dispatch over the request type
      (dispatch[get32(packet, 4)] | unknown)(packet.substr(8));
    }
  }
}

self.addEventListener('message', (function() {
  // We accumulate incoming data in this buffer and read from it as sufficient
  // data becomes available to extract a whole packet.
  var buffer = "";

  function get32() {
    var x = buffer.charCodeAt(0);
    x <<= 8;
    x |= buffer.charCodeAt(1);
    x <<= 8;
    x |= buffer.charCodeAt(2);
    x <<= 8;
    x |= buffer.charCodeAt(3);
    buffer = buffer.substr(4);
    return x;
  }

  function getN(n) {
    var data = buffer.substr(0, n);
    buffer = buffer.substr(n);
    return data;
  }

  // State of the current packet we are accumulating in buffer.
  const WAIT_FOR_LENGTH = 0;
  const WAIT_FOR_DATA = 1;
  var state = WAIT_FOR_LENGTH;

  return (function(e) {
    buffer += e.data;
    var length = buffer.length;
    var size;
    while (true) {
      switch (state) {
      case WAIT_FOR_LENGTH:
        if (length < 4)
          return;
        size = get32();
        state = WAIT_FOR_DATA;
      case WAIT_FOR_DATA:
        if (length < size)
          return;
        RIL.process(getN(size));
        state = WAIT_FOR_LENGTH;
        break;
      }
    }
  });
})();
	