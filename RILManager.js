/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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

/*
 * The RILManager is responsible for
 * - receive data that comes in from some outside source
 * - keeping the state machine to turn it into proper parcels
 * - sending data to outside source (via callback set by source)
 * - keeping list of parcels "in flight", and matching their responses
 * - keeping track of and calling listener callbacks for parcel types
 */

"use strict";

// TODO: Make this more like parcel (i.e. prototyped, etc...)

function RILManager() {
};
RILManager.prototype = {
  /**
   * Callback for sending data, set by whoever is sending data to the
   * outside world (ril ipc thread, socket in extension test, etc...)
   */
  send_func: null,
  /**
   * Serial generated for packets, used for return identification.
   */
  token_gen: 1,
  /**
   * List of parcels currently waiting for a reply. Indexed by
   * token.
   */
  outstanding_messages: {},
  /**
   * List of callback functions. List of lists, indexed by response
   * type.
   */
  callbacks: [],
  /**
   * Queue of parcels that have been constructed by the receive
   * function, but that still need to be passed to listeners via
   * callbacks.
   */
  parcel_queue: [],
  /**
   * Used for keeping final length of parcel currently being
   * constructed by receive.
   */
  current_length: 0,
  /**
   * Used for keeping data buffer of parcel currently being
   * constructed by receive
   */
  current_data: null,
  /**
   * Storage for receive generator.
   */
  receive_sm: null,
  /**
   * Appends new data to the raw buffer currently being used to
   * construct parcels. Gross, but due to ArrayBuffer's not really
   * being made to be splittable/mergable yet, it does the job.
   */
  pushBackData: function(data) {
    var new_data = ArrayBuffer(this.current_data.byteLength + data.byteLength);
    Uint8Array(new_data, 0, this.current_data.byteLength).set(Uint8Array(this.current_data));
    Uint8Array(new_data, this.current_data.byteLength, data.byteLength).set(Uint8Array(data));
    this.current_data = new_data;
  },
  /**
   * Pops data off the front of the raw buffer currently being used to
   * construct parcels. Gross, but due to ArrayBuffer's not really
   * being made to be splittable/mergable yet, it does the job.
   */
  popFrontData: function(l) {
    var new_data = ArrayBuffer(this.current_data.byteLength - l);
    Uint8Array(new_data).set(Uint8Array(this.current_data, l, this.current_data.byteLength-l));
    this.current_data = new_data;
  },
  /**
   * Receive state machine (rsm). Uses generators (argumented yields)
   * in order to stop at the point it's currently parsing at, to wait
   * for new data.
   *
   */
  rsm: function() {
    this.current_data = ArrayBuffer();
    while(1) {
      // Wait for 4 bytes to be received.
      while(this.current_data.byteLength < 4)
      {
        let data = yield;
        this.pushBackData(data);
      }
      // Read parcel length (big endian, converted via htonl before being sent)
      this.current_length = (new DataView(this.current_data, 0, 4)).getUint32(0, false);
      // Remove length from raw data
      this.popFrontData(4);
      // Wait for rest of parcel length to be received
      while(this.current_data.byteLength < this.current_length)
      {
        let data = yield;
        this.pushBackData(data);
      }
      // Read full parcel, copy into new ArrayBuffer
      let new_parcel = ArrayBuffer(this.current_length);
      Uint8Array(new_parcel).set(Uint8Array(this.current_data, 0, this.current_length));
      // Queue for processing at a later point
      this.parcel_queue.push(new RILParcel(new_parcel));
      // Remove parcel data from raw buffer
      this.popFrontData(this.current_length);
    }
  },
  /**
   * Shell function around generator, to instantiate it and start it
   * via next call.
   */
  receive: function(data) {
    // Generator needs creation on first run
    if(this.receive_sm == null)
    {
      this.receive_sm = this.rsm();
      this.receive_sm.next();
    }
    this.receive_sm.send(data);
  },
  /**
   * Prepares a parcel of a certain request type, with a data array.
   * Data array is packed according to parcel type.
   */
  send : function (request_type, data) {
    // Construct the parcel preamble
    let p = new RILParcel();
    p.setRequestType(request_type);
    p.token = this.token_gen++;
    p.data = data;
    // Pack the data based on the parcel type (handled by parcel object)
    p.pack();
    // Set up information for rest of parcel
    let buff_length = p.buffer.byteLength;
    let buff = ArrayBuffer(12 + buff_length);
    // Set parcel length as a little-e 32-bit value
    let parcel_length = Uint32Array(buff, 0, 3);
    parcel_length[0] = 8 + buff_length;
    // Set up full preamble, flipping length to big-e, adding type and token
    parcel_length.set([(new DataView(buff, 0, 4)).getUint32(0, false), p.request_type, p.token]);
    // If we have data, send that along (trying to append 0 size
    // buffers does weird things.
    if(buff_length > 0) {
      Uint8Array(buff, 12, buff_length).set(Uint8Array(p.buffer));
    }
    // Send via callback, put onto list for response waiting
    this.sendFunc(buff);
    this.outstanding_messages[p.token] = p;
  },
  /**
   * Sets up callback for sending out parcels
   */
  setSendFunc : function(f) {
    this.sendFunc = f;
  },
  /**
   * Runs through the parcel queue, running callbacks on all parcels
   * that have related functions. No callback should ever block at
   * this level.
   */
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
  /**
   * Add a callback to be called whenever a response to a certain
   * request type is received.
   */
  addCallback: function (request_type, f){
    if(!(request_type in this.callbacks))
      this.callbacks[request_type] = [];
    this.callbacks[request_type].push(f);
  }
};

