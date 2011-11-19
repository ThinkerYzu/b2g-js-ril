/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Telephony.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Kyle Machulis <kyle@nonpolynomial.com> (Original Author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

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

function testSender(p) {
  let dv = new DataView(p, 0, 20);
  assert(dv.getUint32(0, false) == 16, "of0 == 16");
  assert(dv.getUint32(4, true) == RIL_REQUEST_RADIO_POWER,"of4 == RIL_REQUEST_RADIO_POWER");
  assert(dv.getUint32(8, true) == 1, "of8 == 1");
  assert(dv.getUint32(12, true) == 1, "of12 == 1");
  assert(dv.getUint32(16, true) == 1, "of16 == 1");
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
    console.print("===== Receive whole");
    let ril = new RILManager();
    ril.receive(test_parcel);
    assert(ril.parcel_queue.length == 1, "ril.parcel_queue.length == 1");
    testPacket(ril.parcel_queue[0]);
  }

  {
    //Create a RIL Manager
    console.print("===== Receive in chunks with full size and single data receive");
    let ril = new RILManager();
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
    console.print("===== Receive in full size and chunked data ");
    let ril = new RILManager();
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
    console.print("=====  chunked size and chunked data");
    let ril = new RILManager();
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

  //Send a parcel
  {
    console.print("===== Send parcel");
    let ril = new RILManager();
    ril.setSendFunc(testSender);
    ril.send(RIL_REQUEST_RADIO_POWER, 1);  
  }
  console.print("--------- All tests passed ---------");
};