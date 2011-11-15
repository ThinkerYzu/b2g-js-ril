/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// TODO: Make this more like parcel (i.e. prototyped, etc...)

function RILManager() {
  var sendFunc = null;

  function flipEndianess(buffer, offset) {
    // WHY DOES OFFSET NOT WORK HERE
    let d = Uint8Array(buffer, offset, 4);
    // For some reason the array view doesn't treat the offset
    // correctly, so we have to apply it ourselves.
    return (d[3 + offset] | d[2 + offset] << 8 | d[1 + offset] << 16 | d[0 + offset] << 24);
  }

  return {
    tokenGen: 1,
    outstanding_messages: {},
    callbacks: [],
    currentLength: 0,
    send : function (request_type, data) {
      let p = new RILParcel();
      p.setRequestType(request_type);
      p.token = this.tokenGen++;
      p.data = data;
      p.pack();
      let buff_length = p.buffer.byteLength;
      let buff = ArrayBuffer(12 + buff_length);
      let parcel_length = Uint32Array(buff, 0, 3);
      parcel_length[0] = 8 + buff_length;
      parcel_length.set([flipEndianess(buff,0), p.request_type, p.token]);
      if(buff_length > 0) {
        Uint8Array(buff, 12, buff_length).set(Uint8Array(p.buffer));
      }
      this.sendFunc(buff);
      this.outstanding_messages[p.token] = p;
    },
    setSendFunc : function(f) {
      this.sendFunc = f;
    },
    receive: function (data) {
      let offset = 0;
      while(data.length > offset)
      {
        if(this.currentLength == 0) {
          if(offset + 4 > data.length) {
            console.print("---- WRITE A BETTER STATE MACHINE ----");
          }
          this.currentLength = flipEndianess(data, offset);
          offset += 4;
        }
        console.print("dl " + data.length + " cl " + this.currentLength + " of " + offset);
        if(data.length < this.currentLength + offset) {
          break;
        }
        let currentData = ArrayBuffer(this.currentLength);
        Uint8Array(currentData).set(data.slice(offset, this.currentLength+offset));
        offset += this.currentLength;
        p = new RILParcel(currentData);
        if(p.response_type == 0) {
          // match to our outgoing via token
          if(!(p.token in this.outstanding_messages)) {
            throw "Cannot find outgoing message of token " + p.token;
          }
          // get type of outgoing
          let old = this.outstanding_messages[p.token];
          delete this.outstanding_messages[p.token];
          // run callbacks for outgoing type
          p.setRequestType(old.request_type);
        }
        if(p.unpack != undefined) {
          p.unpack();
        }
        else {
          console.print("No unpack function available for request type " + p.request_type);
        }
        // run this.callbacks for unsolicited
        if(p.request_type in this.callbacks) {
          for each(let f in this.callbacks[p.request_type]){
            f(p.data);
          }
        }
        else {
          console.print("No callbacks for " + p.request_name);
        }
        this.currentLength = 0;
      }
    },
    addCallback: function (request_type, f){
      if(!(request_type in this.callbacks))
        this.callbacks[request_type] = [];
      this.callbacks[request_type].push(f);
    }
  };
}
