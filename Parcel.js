/* -*- Mode: js2-mode; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Base implementation.
 */
function RILParcel(data) {
  this.buffer = data;
};


RILParcel.prototype = {

  /**
   * Expected size of full parcel, so we can know when we've gotten
   * the whole thing. Only needed for parcels that we are receiving.
   */
  expected_size: 0,

  /**
   * Int8Array representing the bytes for the parcel.
   */
  buffer: null,

  /**
   * Array of some type that will be filled either during unpack (for
   * incoming messages), or before packing (for outgoing messages).
   */   
  data: Array(),
  
  /**
   * Common parcel attributes.
   */
  response_type: null,
  request_type: null,
  length: null,
  token: null,

  unpack: function unpack() {
    // Solicited parcels look like [response_type = 0, serial]
    // Unsolicited parcels look like [response_type != 0, request_type]
    let arg;
    console.print("Buffer " + this.buffer);
    [this.response_type, arg] = new Int32Array(this.buffer, 0, 2);
    console.print("Response type " + this.response_type);
    if (this.response_type == 0) {
      this.token = arg;
      console.print("Received reply to Parcel " + this.token);
    } else {
      this.request_type = arg;
      console.print("Unsolicited request type " + this.request_type);
    }    
  },

  pack: function pack() {
    /**
     * Buffer size needs to be:
     * 8 bytes (Request Type + Token)
     * + Data (defined by Parcel return type)
     */
    buffer = new ArrayBuffer(8);
  },
};

function VoidParcel(data) {
  RILParcel.call(this, data);
}
VoidParcel.prototype = {

  __proto__: RILParcel,
  //Nothing to unpack
  unpack: function () {
    RILParcel.prototype.unpack.call(this);
  },

  //Nothing to pack
  pack: function () {
    RILParcel.prototype.pack.call(this);
  }

};

function IntegerListParcel(data) {
  RILParcel.call(this, data);
}
IntegerListParcel.prototype = {
  __proto__: RILParcel,

  unpack: function () {
    RILParcel.prototype.unpack.call(this);
    //TODO unpack further stuff
  },

  pack: function () {
    RILParcel.prototype.pack.call(this);
  }
};

function StringListParcel(data) {
  RILParcel.call(this, data);
}
StringListParcel.prototype = {

  __proto__: RILParcel,

  unpack: function () {
    RILParcel.prototype.unpack.call(this);
    //TODO unpack further stuff
  },

  pack: function () {
    RILParcel.prototype.pack.call(this);
  }

};
