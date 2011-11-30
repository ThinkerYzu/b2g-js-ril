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
 *   Philipp von Weitershausen <philipp@weitershausen.de>
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

/**
 * Various tests for portions of the js RIL handler. Will probably be
 * turned into xpcshell-tests at some point, right now just running them
 * linearly because that does the job fine.
 *
 * Run this on the command line as
 *
 *   $ path/to/js test.js
 *
 */

"use strict";

const B2G_TEST_PARCEL = 12345678;

/**
 * Fake worker APIs.
 */

let onmessage;

let _onRILMessageEvent;
function addEventListener(type, cb) {
  assert(type == "RILMessageEvent",
         "Registering handler for unknown event type: " + type);
  _onRILMessageEvent = cb;
}

function postRILMessage() {
}

function loadScripts() {
  Array.map(arguments, function loadScript(script) {
    load(script);
  });
}

function debug(msg) {
  print(msg);
}

/**
 * Fake APIs for sending messages to the worker.
 */
let worker = {
  postRILMessage: function postRILMessage(message) {
    let event = {type: "RILMessageEvent",
                 data: message};
    _onRILMessageEvent(event);
  },
  postMessage: function postMessage(message) {
    let event = {type: "message",
                 data: message};
    onmessage(event);
  }
};

load("ril_worker.js");

/*
 * Quick assertion class since I'm not sure how to assert in JS
 * otherwise.
 */

function AssertException(message) { this.message = message; }
AssertException.prototype.toString = function () {
  return 'AssertException: ' + this.message;
}

function assert(exp, message) {
  if (!exp) {
    throw new AssertException(message);
  }
}

/*
 * Utility functions for tests
 */
function testPacket(p) {
  /*
   * Test function for putting chunked parcels back together. Makes
   * sure we recreated the parcel correctly.
   */
  let response = Buf.readUint32();
  assert(response == 1, "response should be 1, is " + response);
  let request = Buf.readUint32();
  assert(request == RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED,"p.request_type should be RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED (1000), is " + request);
  let data = Buf.readUint32();
  assert(data == 0, "data should be 0 is " + data);
}

function testSender(p) {
  /*
   * Test callback, used for making sure send creates packets correctly.
   */
  let test_parcel = [0,0,0,12,23,0,0,0,1,0,0,0,1,0,0,0];
  for(let i = 0; i < p.byteLength; ++i) {
    assert(test_parcel[i] === p[i], "Index " + i + " does not match");
  }
}

function testString(p) {
  let test_parcel = [0,0,0,50,78,97,188,0,2,0,0,0,18,0,0,0,73,0,32,0,97,0,109,0,32,0,97,0,32,0,116,0,101,0,115,0,116,0,32,0,115,0,116,0,114,0,105,0,110,0,103,0,0,0];
  for(let i = 0; i < p.byteLength; ++i) {
    assert(test_parcel[i] === p[i], "Index " + i + " does not match");
  }  
}

function runTests() {

  /*********************************
   * Parcel Receive Tests
   *********************************/

  //Create a byte array that looks like a raw parcel


  let old_process_parcel = Buf.processParcel;
  Buf.processParcel = testPacket;

  {
    /*
     * Receive a packet length and data as a single buffer
     */
    print("===== Receive whole");
    let test_parcel = [0,0,0,12,1,0,0,0,232,3,0,0,0,0,0,0];
    Buf.processIncoming(test_parcel);
    //assert(ril.parcel_queue.length == 1, "ril.parcel_queue.length == 1");
    //testPacket(ril.parcel_queue[0]);
  }

  {
    /*
     * Receive a packet length and data as different buffers
     */
    print("===== Receive in chunks with full size and single data receive");
    let test_parcel = [0,0,0,12,1,0,0,0,232,3,0,0,0,0,0,0];
    Buf.processIncoming(test_parcel.splice(0, 4));
    Buf.processIncoming(test_parcel.splice(0, 12));
  }

  {
    /*
     * Receive a packet length and data as different buffers, with data
     * distributed through different buffers also.
     */
    print("===== Receive in full size and chunked data ");
    let test_parcel = [0,0,0,12,1,0,0,0,232,3,0,0,0,0,0,0];
    Buf.processIncoming(test_parcel.splice(0, 4));
    Buf.processIncoming(test_parcel.splice(0, 5));
    Buf.processIncoming(test_parcel.splice(0, 3));
    Buf.processIncoming(test_parcel.splice(0, 4));
  }

  {
    /*
     * Receive all data in weird sized chunks, making sure that both
     * packet length and data are chunked.
     */
    print("=====  chunked size and chunked data");
    let test_parcel = [0,0,0,12,1,0,0,0,232,3,0,0,0,0,0,0];
    Buf.processIncoming(test_parcel.splice(0, 3));
    Buf.processIncoming(test_parcel.splice(0, 5));
    Buf.processIncoming(test_parcel.splice(0, 4));
    Buf.processIncoming(test_parcel.splice(0, 4));
  }

  Buf.processParcel = old_process_parcel;

  /*********************************
   * Parcel Send Tests
   *********************************/

  let oldPostRILMessage = postRILMessage;
  {
    /*
     * Send a parcel, wire callback through tester function
     */
    print("===== Send parcel");

    postRILMessage = testSender;
    Buf.newParcel(RIL_REQUEST_RADIO_POWER);
    Buf.writeUint32(1);
    Buf.sendParcel();
    postRILMessage = oldPostRILMessage;
  }

  /*********************************
   * Type tests
   *********************************/  
  {
    print("===== String writing");
    postRILMessage = testString;
    Buf.newParcel(B2G_TEST_PARCEL);
    Buf.writeString("I am a test string");
    Buf.sendParcel();
    postRILMessage = oldPostRILMessage;
  }
  {
    print("===== String reading");
    let test_parcel = [0,0,0,50,1,0,0,0,78,97,188,0,18,0,0,0,73,0,32,0,97,0,109,0,32,0,97,0,32,0,116,0,101,0,115,0,116,0,32,0,115,0,116,0,114,0,105,0,110,0,103,0, 0, 0];
    RIL[B2G_TEST_PARCEL] = function B2G_TEST_PARCEL(l) {
      let str = Buf.readString();
      print(str);
      assert(str === "I am a test string", "String != 'I am a test string': " + str);
    };
    Buf.processIncoming(test_parcel);    
  }
  {
    print("===== String list reading");
    let test_parcel = [0,0,0,138,1,0,0,0,78,97,188,0,3,0,0,0,18,0,0,0,73,0,32,0,97,0,109,0,32,0,97,0,32,0,116,0,101,0,115,0,116,0,32,0,115,0,116,0,114,0,105,0,110,0,103,0,0,0,18,0,0,0,73,0,32,0,97,0,109,0,32,0,97,0,32,0,116,0,101,0,115,0,116,0,32,0,115,0,116,0,114,0,105,0,110,0,103,0,0,0,18,0,0,0,73,0,32,0,97,0,109,0,32,0,97,0,32,0,116,0,101,0,115,0,116,0,32,0,115,0,116,0,114,0,105,0,110,0,103,0,0,0];
    RIL[B2G_TEST_PARCEL] = function B2G_TEST_PARCEL(l) {
      let str = Buf.readStringList();
      assert(str.length === 3, "String list length should be 3, is " + str.length);
      for(let i = 0; i < str.length; ++i) {
        print(str[i]);
        assert(str[i] === "I am a test string", "String != 'I am a test string': " + str[i]);
      }
    };
    Buf.processIncoming(test_parcel);    
  }


  print("--------- All tests passed ---------");
};

runTests();
