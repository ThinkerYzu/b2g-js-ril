/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

"use strict";

function Phone(rm) {
	this.ril = rm;
	this.registerCallbacks();
};

Phone.prototype = {
	ril: null,
	IMEISV: null,
	IMSI: null,
	operator: null,
	IMEI: null,
	baseband_version: null,
  network_selection_mode: null,
  dialed_phone: false,
  initializePhone: function(s) {
    this.setScreenState(1);
    this.setNetworkType(1);
    this.ril.send(RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE);
  },
	setIMSI: function(s) {
		console.print("Setting IMSI to " + s);
		this.IMSI = s;
	},
	setIMEI: function(s) {
		console.print("Setting IMEI to " + s);
		this.IMEI = s;
	},
	setIMEISV: function(s) {
		console.print("Setting IMEISV to " + s);
		this.IMEISV = s;
	},
  setScreenState: function(i) {
    this.ril.send(RIL_REQUEST_SCREEN_STATE, i);
  },
	setBasebandVersion: function(s) {
		console.print("Setting baseband to " + s);
		this.baseband_version = s;
	},
  signalStrengthReceived : function(i) {
    console.print("Strength: " + [x for each (x in i)]);
  },
  setNetworkType : function(i) {
    this.ril.send(RIL_REQUEST_SET_PREFERRED_NETWORK_TYPE, i);
  },
  setNetworkSelectionMode : function(i) {
    this.networkSelectionMode = i;
  },
  setRegistrationState : function(sl) {
  },
  setGPRSRegistrationState : function(sl) {
  },
  dialPhone : function(s) {
    let d = [];
    d[0] = "18888888888";
    d[1] = 0;
    d[2] = 0;
    d[3] = 0;
    this.ril.send(RIL_REQUEST_DIAL, d);
  },
  setOperator : function(sl) {
    console.print("Operator: " + sl[0] + " " + sl[1] + " " + sl[2]);
    if(!this.dialed_phone) {
      this.dialed_phone = true;
      this.dialPhone();
    }
  },
  networkStateChangedRequest : function(v) {
    this.ril.send(RIL_REQUEST_REGISTRATION_STATE);
    this.ril.send(RIL_REQUEST_GPRS_REGISTRATION_STATE);
    this.ril.send(RIL_REQUEST_OPERATOR);
  },
	radioStateChangedRequest : function(d) {
		console.print("Radio state changed. Requesting status update");
    if(d == RADIOSTATE_OFF) {
      this.ril.send(RIL_REQUEST_RADIO_POWER, 1);
    }
    else {
      if(this.IMEI == null) {
        this.ril.send(RIL_REQUEST_GET_IMEI);
        this.networkStateChangedRequest();
      }
      if(this.IMEISV == null) {
        this.ril.send(RIL_REQUEST_GET_IMEISV);
      }
      // if(this.baseband_version == null) {
      //   this.ril.send(RIL_REQUEST_BASEBAND_VERSION);
      // }
    }
	},
	registerCallbacks: function() {
		this.ril.addCallback(RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED,
                         this.radioStateChangedRequest.bind(this) );
		this.ril.addCallback(RIL_REQUEST_GET_IMSI,
                         this.setIMSI.bind(this));
		this.ril.addCallback(RIL_REQUEST_GET_IMEI,
                         this.setIMEI.bind(this));
		this.ril.addCallback(RIL_REQUEST_GET_IMEISV,
                         this.setIMEISV.bind(this));
		this.ril.addCallback(RIL_REQUEST_BASEBAND_VERSION,
                         this.setBasebandVersion.bind(this));
    this.ril.addCallback(RIL_UNSOL_SIGNAL_STRENGTH,
                         this.signalStrengthReceived.bind(this));
    this.ril.addCallback(RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE,
                         this.setNetworkSelectionMode.bind(this));
    this.ril.addCallback(RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED,
                         this.networkStateChangedRequest.bind(this));
    this.ril.addCallback(RIL_REQUEST_OPERATOR,
                         this.setOperator.bind(this));
    this.ril.addCallback(RIL_REQUEST_REGISTRATION_STATE,
                         this.setRegistrationState.bind(this));
    this.ril.addCallback(RIL_REQUEST_GPRS_REGISTRATION_STATE,
                         this.setGPRSRegistrationState.bind(this));
	}
};

