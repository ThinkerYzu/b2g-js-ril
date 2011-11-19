/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

"use strict";

// TODO: Make this more like parcel (i.e. prototyped, etc...)

function RILManager() {
  var send_func = null;

  return {
    token_gen: 1,
    outstanding_messages: {},
    callbacks: [],
    parcel_queue: [],
    receive_state: 0,
    current_size: 0,
    current_length: 0,
    current_data: null,
    receive_sm: null,
    pushBackData: function(data) {
      var new_data = ArrayBuffer(this.current_data.byteLength + data.byteLength);
      Uint8Array(new_data, 0, this.current_data.byteLength).set(Uint8Array(this.current_data));
      Uint8Array(new_data, this.current_data.byteLength, data.byteLength).set(Uint8Array(data));
      this.current_data = new_data;
    },
    popFrontData: function(l) {
      var new_data = ArrayBuffer(this.current_data.byteLength - l);
      Uint8Array(new_data).set(Uint8Array(this.current_data, l, this.current_data.byteLength-l));
      this.current_data = new_data;
    },
    rsm: function() {
      this.current_data = ArrayBuffer();
      while(1) {
        while(this.current_data.byteLength < 4)
        {
          let data = yield;
          this.pushBackData(data);
        }
        this.current_length = (new DataView(this.current_data, 0, 4)).getUint32(0, false);
        this.popFrontData(4);
        while(this.current_data.byteLength < this.current_length)
        {
          let data = yield;
          this.pushBackData(data);
        }
        let new_parcel = ArrayBuffer(this.current_length);
        Uint8Array(new_parcel).set(Uint8Array(this.current_data, 0, this.current_length));
        this.parcel_queue.push(new RILParcel(new_parcel));
        this.popFrontData(this.current_length);
      }
    },
    receive: function(data) {
      if(this.receive_sm == null)
      {
        this.receive_sm = this.rsm();
        this.receive_sm.next();
      }
      this.receive_sm.send(data);
    },
    send : function (request_type, data) {
      let p = new RILParcel();
      p.setRequestType(request_type);
      p.token = this.token_gen++;
      p.data = data;
      p.pack();
      let buff_length = p.buffer.byteLength;
      let buff = ArrayBuffer(12 + buff_length);
      let parcel_length = Uint32Array(buff, 0, 3);
      parcel_length[0] = 8 + buff_length;
      parcel_length.set([(new DataView(buff, 0, 4)).getUint32(0, false), p.request_type, p.token]);
      if(buff_length > 0) {
        Uint8Array(buff, 12, buff_length).set(Uint8Array(p.buffer));
      }
      console.print([x for each (x in Uint8Array(buff))]);
      this.sendFunc(buff);
      this.outstanding_messages[p.token] = p;
    },
    setSendFunc : function(f) {
      this.sendFunc = f;
    },
    exhaust_queue: function () {
      //TODO: Fix
      /*
      while(this.parcel_queue.length > 0)
      {
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
        this.current_length = 0;
      }
       */
    },
    addCallback: function (request_type, f){
      if(!(request_type in this.callbacks))
        this.callbacks[request_type] = [];
      this.callbacks[request_type].push(f);
    }
  };
}
