const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

const GLOBAL_SCOPE = this;

function startup(data, reason) {
  function load(file) {
    Services.scriptloader.loadSubScript(data.resourceURI.spec + file,
                                        GLOBAL_SCOPE);
  }
  load("src/Parcel.js");
}


function shutdown(data, reason) {
  // Easily reload scripts: auto-enable when disabling
  AddonManager.getAddonByID(data.id, function(addon) {
    addon.userDisabled = false;
  });
}
