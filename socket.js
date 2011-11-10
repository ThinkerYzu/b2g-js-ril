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
    this.socket = gTransportService.createTransport(null, 0, host, port, null);
    this.inputStream = this.socket.openInputStream(0, 0, 0);
    this.binaryInputStream = BinaryInputStream(this.inputStream);
    this.outputStream = this.socket.openOutputStream(0, 0, 0);
    this.binaryOutputStream = BinaryOutputStream(this.outputStream);
    
    this.inputStream.asyncWait(this, 0, 0, Services.tm.currentThread);
  },

  stop: function stop() {
    this.socket.close();
  },

  /**
   * nsIInputStreamCallback
   */
  onInputStreamReady: function onInputStreamReady() {
    let length;
    while (length = this.inputStream.available()) {
      let byte_array = this.binaryInputStream.readByteArray(length);
      let array_buffer = Uint8Array(byte_array);
      this.processData(array_buffer);
    }
    this.inputStream.asyncWait(this, 0, 0, Services.tm.currentThread);
  },

  processData: function processData(array_buffer) {
    //TODO Go on our merry way and decode the parcels
  },

  sendData: function sendData(array_buffer) {
    let byte_array = Uint8Array(array_buffer);
    this.binaryOutputStream.writeByteArray(byte_array, byte_array.length);
    this.binaryOutputStream.flush();
  }

};
