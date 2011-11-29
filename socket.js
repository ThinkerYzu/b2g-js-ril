/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");

const gTransportService = Cc["@mozilla.org/network/socket-transport-service;1"]
                            .getService(Ci.nsISocketTransportService);

const BinaryInputStream = Components.Constructor(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream");

const BinaryOutputStream = Components.Constructor(
  "@mozilla.org/binaryoutputstream;1",
  "nsIBinaryOutputStream",
  "setOutputStream");

let global = this;

let SocketListener = {

  connected: false,

  listen: function listen(host, port, errorCallback) {
    this.errorCallback = errorCallback;
    this.socket = gTransportService.createTransport(null, 0, host, port, null);
    this.inputStream = this.socket.openInputStream(0, 0, 0);
    this.binaryInputStream = BinaryInputStream(this.inputStream);
    this.outputStream = this.socket.openOutputStream(0, 0, 0);
    this.binaryOutputStream = BinaryOutputStream(this.outputStream);
    this.inputStream.asyncWait(this, 0, 0, Services.tm.currentThread);
    this.connected = true;
    debug("Connected to " + host + ":" + port);
  },

  stop: function stop() {
    debug("Stopping socket");
    this.connected = false;
    this.socket.close(0);
  },

  /**
   * nsIInputStreamCallback
   */
  onInputStreamReady: function onInputStreamReady() {
    if (!this.connected) {
      return;
    }
    while (true) {
      let data;
      try {
        let length = this.inputStream.available();
        if (!length) {
          break;
        }
        data = this.binaryInputStream.readByteArray(length);
      } catch(ex) {
        this.stop();
        this.errorCallback(ex);
        return;
      }
      this.processData(data);
    }
    this.inputStream.asyncWait(this, 0, 0, Services.tm.currentThread);
  },

  processData: function processData(array_buffer) {
    debug("Received " + array_buffer);
    let event = document.createEvent("Event");
    event.initEvent("RILMessageEvent", true, true);
    event.data = new Uint8Array(array_buffer);
    debug("Dispatching event");
    window.dispatchEvent(event);
  },

  sendData: function sendData(array_buffer) {
    let byte_array = new Uint8Array(array_buffer);
    debug("Sending " + Array.slice(byte_array));
    //XXX TODO is the Array.slice() necessary? Maybe writeByteArray()
    // will just eat a TypedArray...
    this.binaryOutputStream.writeByteArray(Array.slice(byte_array),
                                           byte_array.length);
    this.binaryOutputStream.flush();
  }

};

/**
 * The RIL Worker has this global function to talk to the RIL IPC thread.
 */
function postRILMessage(message) {
  SocketListener.sendData(message);
}

function debug(msg) {
  console.log(msg);
}

function loadScripts() {
}
