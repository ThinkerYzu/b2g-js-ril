/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

const GLOBAL_SCOPE = this;

let listener;
let use_listener = true;

function startup(data, reason) {
  function load(file) {
    Services.scriptloader.loadSubScript(data.resourceURI.spec + file,
                                        GLOBAL_SCOPE);
  }
  load("ril_vars.js"); 
  load("utils.js");
  load("Parcel.js");
  load("RILManager.js");
  load("Phone.js");

  ril = new RILManager();
  phone = new Phone(ril);
  
  load("socket.js");
  if(use_listener) {
    console.print("-------- Bringing up socket connection --------");
    listener = new SocketListener(ril, phone);
    listener.listen("localhost", "6200");
  }
  else {
    console.print("-------- Running Test File --------");
    load("test.js");
    runTests();
  }
  
}


function shutdown(data, reason) {
  if(typeof(listener) !== "undefined") {
    listener.stop();
  }
  // Re-enable the ourselves when we get disabled. That way you can reload this
  // code by simply clicking the "Disable" button in about:addons.
  AddonManager.getAddonByID(data.id, function(addon) {
      addon.userDisabled = false;
    });
}
