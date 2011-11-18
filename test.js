/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

function AssertException(message) { this.message = message; }
AssertException.prototype.toString = function () {
  return 'AssertException: ' + this.message;
}

function assert(exp, message) {
  if (!exp) {
    throw new AssertException(message);
  }
}

function testPacket(p) {
    assert(p.response_type == 1, "p.response_type == 1");
    assert(p.request_type == RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED,"p.request_type == RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED");
    assert(p.data == 0, "p.data == 0");

}

function runTests() {
  //Create a byte array that looks like a raw parcel
  var test_parcel = new ArrayBuffer(16);
  var dv_test = new DataView(test_parcel, 0);
  dv_test.setUint32(0, 12, false);
  dv_test.setUint32(4, 1, true); 
  dv_test.setUint32(8, RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED, true);
  dv_test.setUint32(12, 0, true); 

  {
    console.print("===== Send whole");
    let ril = new RILManager();
    let l;
    let type;
    let status;
    ril.receive(test_parcel);
    assert(ril.parcel_queue.length == 1, "ril.parcel_queue.length == 1");
    testPacket(ril.parcel_queue[0]);
  }
  
  {
    //Create a RIL Manager
    console.print("===== Send in chunks with full size and single data receive");
    let ril = new RILManager();
    let l;
    let type;
    let status;
    let parcel_parts = Array();
    parcel_parts[0] = ArrayBuffer(4);
    Uint8Array(parcel_parts[0]).set(Uint8Array(test_parcel, 0, 4));
    parcel_parts[1] = ArrayBuffer(12);
    Uint8Array(parcel_parts[1]).set(Uint8Array(test_parcel, 4, 12));
    for each (x in parcel_parts) {
      assert(ril.parcel_queue.length == 0, "ril.parcel_queue.length == 0");
      ril.receive(x);
    };    
    assert(ril.parcel_queue.length == 1, "ril.parcel_queue.length == 1");
    testPacket(ril.parcel_queue[0]);
  }

  {
    //Create a RIL Manager
    console.print("===== Send in full size and chunked data ");
    let ril = new RILManager();
    let l;
    let type;
    let status;
    let parcel_parts = Array();
    parcel_parts[0] = ArrayBuffer(4);
    Uint8Array(parcel_parts[0]).set(Uint8Array(test_parcel, 0, 4));
    parcel_parts[1] = ArrayBuffer(5);
    Uint8Array(parcel_parts[1]).set(Uint8Array(test_parcel, 4, 5));
    parcel_parts[2] = ArrayBuffer(3);
    Uint8Array(parcel_parts[2]).set(Uint8Array(test_parcel, 9, 3));
    parcel_parts[3] = ArrayBuffer(4);
    Uint8Array(parcel_parts[3]).set(Uint8Array(test_parcel, 12, 4));   
    for each (x in parcel_parts) {
      assert(ril.parcel_queue.length == 0, "ril.parcel_queue.length == 0");
      ril.receive(x);
    };    
    assert(ril.parcel_queue.length == 1, "ril.parcel_queue.length == 1");
    testPacket(ril.parcel_queue[0]);
  }

  {
    console.print("===== Send chunked size and chunked data");
    let ril = new RILManager();
    let l;
    let type;
    let status;
    let parcel_parts = Array();
    parcel_parts[0] = ArrayBuffer(3);
    Uint8Array(parcel_parts[0]).set(Uint8Array(test_parcel, 0, 3));
    parcel_parts[1] = ArrayBuffer(5);
    Uint8Array(parcel_parts[1]).set(Uint8Array(test_parcel, 3, 5));
    parcel_parts[2] = ArrayBuffer(4);
    Uint8Array(parcel_parts[2]).set(Uint8Array(test_parcel, 8, 4));
    parcel_parts[3] = ArrayBuffer(4);
    Uint8Array(parcel_parts[3]).set(Uint8Array(test_parcel, 12, 4));
    for each (x in parcel_parts) {
      assert(ril.parcel_queue.length == 0, "ril.parcel_queue.length == 0");
      ril.receive(x);
    };

    assert(ril.parcel_queue.length == 1, "ril.parcel_queue.length == 1");
    testPacket(ril.parcel_queue[0]);
  }

  //Send an unsolicited packet to it

  //Send a solicited response packet to it
  console.print("--------- All tests passed ---------");
};