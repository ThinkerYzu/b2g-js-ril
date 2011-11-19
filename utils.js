/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

"use strict";

function ffConsole() { }

ffConsole.prototype = {
  consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
  
  print: function print(aMessage) {
    this.consoleService.logStringMessage("My component: " + aMessage);
  },

};

var console = new ffConsole();