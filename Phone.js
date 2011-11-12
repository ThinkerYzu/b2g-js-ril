/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


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
	setBasebandVersion: function(s) {
		console.print("Setting baseband to " + s);
		this.baseband_version = s;
	},
	radioStateChangedRequest : function(d) {
		console.print("Radio state changed. Requesting status update");
		this.ril.send(RIL_REQUEST_GET_IMEI);
		this.ril.send(RIL_REQUEST_GET_IMEISV);
		//this.ril.send(RIL_REQUEST_GET_IMSI);
		// this.ril.send(RIL_REQUEST_BASEBAND_VERSION);
	},
	registerCallbacks: function() {
		this.ril.addCallback(RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED, this.radioStateChangedRequest.bind(this) );
		this.ril.addCallback(RIL_REQUEST_GET_IMSI, this.setIMSI.bind(this));
		this.ril.addCallback(RIL_REQUEST_GET_IMEI, this.setIMEI.bind(this));
		this.ril.addCallback(RIL_REQUEST_GET_IMEISV, this.setIMEISV.bind(this));
		this.ril.addCallback(RIL_REQUEST_BASEBAND_VERSION, this.setBasebandVersion.bind(this));
	}
};

