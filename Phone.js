/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


function Phone() {
};

Phone.prototype = {
	IMEISV: null,
	IMSI: null,
	operator: null,
	IMEI: null,
	baseband_version: null,
	setIMSI: function(s) {
		this.IMSI = s;	
	},
	setIMEI: function(s) {
		console.print("Setting IMEI to " + s);
		this.IMEI = s;	
	},
	setIMEISV: function(s) {
		this.IMEISV = s;	
	},
	setBasebandVersion: function(s) {
		this.baseband_version = s;
	},
	radioStateChangedRequest : function(d) {
		console.print("Radio state changed. Requesting status update");
	},
	registerCallbacks: function(rm) {
		rm.addCallback(RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED, function(d) { this.radioStateChangedRequest(d); console.print("I ran!"); } );
		// rm.addCallback(RIL_REQUEST_GET_IMSI, Phone.setIMSI, this);
		// rm.addCallback(RIL_REQUEST_GET_IMEI, Phone.setIMEI, this);
		// rm.addCallback(RIL_REQUEST_GET_IMEISV, Phone.setIMEISV, this);
		// rm.addCallback(RIL_REQUEST_BASEBAND_VERSION, Phone.setBasebandVersion, this);
	}
};

