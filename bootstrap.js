const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

const GLOBAL_SCOPE = this;

let listener;

function startup(data, reason) {
  function load(file) {
    Services.scriptloader.loadSubScript(data.resourceURI.spec + file,
                                        GLOBAL_SCOPE);
  }
  load("src/Parcel.js");
  load("socket.js");
  listener = new SocketListener();
  //listener.listen("host", "port");
}


function shutdown(data, reason) {
  listener.stop();

  // Re-enable the ourselves when we get disabled. That way you can reload this
  // code by simply clicking the "Disable" button in about:addons.
  AddonManager.getAddonByID(data.id, function(addon) {
    addon.userDisabled = false;
  });
}
