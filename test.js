/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

function runTests() {

  //Create a byte array that looks like a raw parcel
  let test_parcel = new ArrayBuffer(16);
  let dv_test = new DataView(test_parcel, 0);
  dv_test.setUint32(0, 12, false);
  dv_test.setUint32(4, 1, true); 
  dv_test.setUint32(8, RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED, true);
  dv_test.setUint32(12, 0, true); 

  //Create a RIL Manager
  ril = new RILManager();
  //Send whole (test construction)
  {
    let l;
    let type;
    let status;
    ril.receive(test_parcel);
    
  }
  //Send in chunks (test state machine)
  


  //Send an unsolicited packet to it

  //Send a solicited response packet to it

};