/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

function startup(data, reason) {
  Components.manager.addBootstrappedManifestLocation(data.installPath);
}

function shutdown(data, reason) {
  Components.manager.removeBootstrappedManifestLocation(data.installPath);
}
