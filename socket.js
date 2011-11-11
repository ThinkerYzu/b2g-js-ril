/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
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

function SocketListener() {};
SocketListener.prototype = {

  listen: function listen(host, port) {
    this.stopped = false;
    this.socket = gTransportService.createTransport(null, 0, host, port, null);
    this.inputStream = this.socket.openInputStream(0, 0, 0);
    this.binaryInputStream = BinaryInputStream(this.inputStream);
    this.outputStream = this.socket.openOutputStream(0, 0, 0);
    this.binaryOutputStream = BinaryOutputStream(this.outputStream);
    
    this.inputStream.asyncWait(this, 0, 0, Services.tm.currentThread);
  },

  stop: function stop() {
    consoleMsg("Stopping socket");
    this.stopped = true;
    this.socket.close(0);
  },

  /**
   * nsIInputStreamCallback
   */
  onInputStreamReady: function onInputStreamReady() {
    let length;
    while (!this.stopped && (length = this.inputStream.available())) {
      let byte_array = this.binaryInputStream.readByteArray(length);
      let array_buffer = Uint8Array(byte_array);
      this.processData(array_buffer);
    }
    if(!this.stopped) {
      this.inputStream.asyncWait(this, 0, 0, Services.tm.currentThread);
    }
  },

  processData: function processData(array_buffer) {
    consoleMsg("We got some data!");
  },

  sendData: function sendData(array_buffer) {
    let byte_array = Uint8Array(array_buffer);
    this.binaryOutputStream.writeByteArray(byte_array, byte_array.length);
    this.binaryOutputStream.flush();
  }

};
