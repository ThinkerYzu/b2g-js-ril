
/**
 * Base implementation.
 */
function RILParcel(buffer) {
  this.buffer = buffer;
};
RILParcel.prototype = {

  /**
   * Int8Array representing the bytes for the parcel.
   */
  buffer: null,

  /**
   * Common parcel attributes.
   */
  response_type: null,
  request_type: null,
  length: null,
  serial: null,

  unpack: function unpack() {
    // Solicited parcels look like [response_type = 0, serial]
    // Unsolicited parcels look like [response_type != 0, request_type]
    let arg;
    [this.response_type, arg] = new Int32Array(this.buffer, 0, 2);
    if (this.response_type == 0) {
      this.serial = arg;
    } else {
      this.request_type = arg;
    }
  },

  pack: function pack() {

  },
};

function IntegerListParcel(buffer) {
  RILParcel.call(this, buffer);
}
IntegerListParcel.prototype = {

  unpack: function () {
    RILParcel.prototype.unpack.call(this);
    //TODO unpack further stuff
  },

  pack: function () {
    RILParcel.prototype.pack.call(this);
  }

};
