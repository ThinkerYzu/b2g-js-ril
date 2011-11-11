/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Base implementation.
 */
function RILParcel(data) {

    this.buffer = data;
    this.baseUnpack();
};


RILParcel.prototype = {

    /**
     * Expected size of full parcel, so we can know when we've gotten
     * the whole thing. Only needed for parcels that we are receiving.
     */
    expected_size: 0,
    
    /**
     * Int8Array representing the bytes for the parcel.
     */
    buffer: null,

    /**
     * Array of some type that will be filled either during unpack (for
     * incoming messages), or before packing (for outgoing messages).
     */   
    data: [],
    
    /**
     * Common parcel attributes.
     */
    response_type: null,
    request_type: null,
    length: null,
    token: null,
    pack: null,
    unpack: null,

    baseUnpack: function () {
        // Solicited parcels look like [response_type = 0, serial]
        // Unsolicited parcels look like [response_type != 0, request_type]
        let arg;
        console.print("Buffer " + this.buffer);
        [this.response_type, arg] = new Int32Array(this.buffer, 0, 2);
        console.print("Response type " + this.response_type);
        if (this.response_type == 0) {
            this.token = arg;
            console.print("Received reply to Parcel " + this.token);
        } else {
            this.request_type = arg;
            console.print("Unsolicited request type " + this.request_type);
            this.pack = this.parcel_types[this.request_type].packType;
            this.unpack = this.parcel_types[this.request_type].unpackType;
        }    
    },

    basePack: function () {
        /**
         * Buffer size needs to be:
         * 8 bytes (Request Type + Token)
         * + Data (defined by Parcel return type)
         */
        let buffer = new ArrayBuffer(8);
    },

    voidUnpack: function () {
    },
    voidPack: function () {
    },
    noUnpack: function () {
    },
    noPack: function () {
    },
    stringUnpack: function () {
    },
    stringPack: function () {
    },   
    intUnpack: function() {
        let data = Int32Array(this.buffer, 8, 1)[0];
        console.print("Data: " + data);
    },
    intPack: function() {
    },
    stringListUnpack: function () {
    },    
    stringListPack: function () {
    },
    intListUnpack: function() {
    },
    intListPack:function() {
    },
    parcel_types : {}
};

(function () {
   let p = RILParcel.prototype;
   let t = p.parcel_types;

  t[RIL_REQUEST_GET_SIM_STATUS] = {
    packType: p.voidUnpack,
    unpackType: p.voidPack
  };
  t[RIL_REQUEST_ENTER_SIM_PIN] = 2;
  t[RIL_REQUEST_ENTER_SIM_PUK] = 3;
  t[RIL_REQUEST_ENTER_SIM_PIN2] = 4;
  t[RIL_REQUEST_ENTER_SIM_PUK2] = 5;
  t[RIL_REQUEST_CHANGE_SIM_PIN] = 6;
  t[RIL_REQUEST_CHANGE_SIM_PIN2] = 7;
  t[RIL_REQUEST_ENTER_NETWORK_DEPERSONALIZATION] = 8;
  t[RIL_REQUEST_GET_CURRENT_CALLS] = 9;
  t[RIL_REQUEST_DIAL] = 10;
  t[RIL_REQUEST_GET_IMSI] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_HANGUP] = 12;
  t[RIL_REQUEST_HANGUP_WAITING_OR_BACKGROUND] = 13;
  t[RIL_REQUEST_HANGUP_FOREGROUND_RESUME_BACKGROUND] = 14;
  t[RIL_REQUEST_SWITCH_WAITING_OR_HOLDING_AND_ACTIVE] = 15;
  t[RIL_REQUEST_SWITCH_HOLDING_AND_ACTIVE] = 15;
  t[RIL_REQUEST_CONFERENCE] = 16;
  t[RIL_REQUEST_UDUB] = 17;
  t[RIL_REQUEST_LAST_CALL_FAIL_CAUSE] = 18;
  t[RIL_REQUEST_SIGNAL_STRENGTH] = 19;
  t[RIL_REQUEST_REGISTRATION_STATE] = 20;
  t[RIL_REQUEST_GPRS_REGISTRATION_STATE] = 21;
  t[RIL_REQUEST_OPERATOR] = 22;
  t[RIL_REQUEST_RADIO_POWER] = 23;
  t[RIL_REQUEST_DTMF] = 24;
  t[RIL_REQUEST_SEND_SMS] = 25;
  t[RIL_REQUEST_SEND_SMS_EXPECT_MORE] = 26;
  t[RIL_REQUEST_SETUP_DATA_CALL] = 27;
  t[RIL_REQUEST_SIM_IO] = 28;
  t[RIL_REQUEST_SEND_USSD] = 29;
  t[RIL_REQUEST_CANCEL_USSD] = 30;
  t[RIL_REQUEST_GET_CLIR] = 31;
  t[RIL_REQUEST_SET_CLIR] = 32;
  t[RIL_REQUEST_QUERY_CALL_FORWARD_STATUS] = 33;
  t[RIL_REQUEST_SET_CALL_FORWARD] = 34;
  t[RIL_REQUEST_QUERY_CALL_WAITING] = 35;
  t[RIL_REQUEST_SET_CALL_WAITING] = 36;
  t[RIL_REQUEST_SMS_ACKNOWLEDGE] = 37;
  t[RIL_REQUEST_GET_IMEI] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_GET_IMEISV] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_ANSWER] = 40;
  t[RIL_REQUEST_DEACTIVATE_DATA_CALL] = 41;
  t[RIL_REQUEST_QUERY_FACILITY_LOCK] = 42;
  t[RIL_REQUEST_SET_FACILITY_LOCK] = 43;
  t[RIL_REQUEST_CHANGE_BARRING_PASSWORD] = 44;
  t[RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE] = 45;
  t[RIL_REQUEST_SET_NETWORK_SELECTION_AUTOMATIC] = 46;
  t[RIL_REQUEST_SET_NETWORK_SELECTION_MANUAL] = 47;
  t[RIL_REQUEST_QUERY_AVAILABLE_NETWORKS] = 48;
  t[RIL_REQUEST_DTMF_START] = 49;
  t[RIL_REQUEST_DTMF_STOP] = 50;
  t[RIL_REQUEST_BASEBAND_VERSION] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_SEPARATE_CONNECTION] = 52;
  t[RIL_REQUEST_SET_MUTE] = 53;
  t[RIL_REQUEST_GET_MUTE] = 54;
  t[RIL_REQUEST_QUERY_CLIP] = 55;
  t[RIL_REQUEST_LAST_DATA_CALL_FAIL_CAUSE] = 56;
  t[RIL_REQUEST_DATA_CALL_LIST] = 57;
  t[RIL_REQUEST_RESET_RADIO] = 58;
  t[RIL_REQUEST_OEM_HOOK_RAW] = 59;
  t[RIL_REQUEST_OEM_HOOK_STRINGS] = 60;
  t[RIL_REQUEST_SCREEN_STATE] = 61;
  t[RIL_REQUEST_SET_SUPP_SVC_NOTIFICATION] = 62;
  t[RIL_REQUEST_WRITE_SMS_TO_SIM] = 63;
  t[RIL_REQUEST_DELETE_SMS_ON_SIM] = 64;
  t[RIL_REQUEST_SET_BAND_MODE] = 65;
  t[RIL_REQUEST_QUERY_AVAILABLE_BAND_MODE] = 66;
  t[RIL_REQUEST_STK_GET_PROFILE] = 67;
  t[RIL_REQUEST_STK_SET_PROFILE] = 68;
  t[RIL_REQUEST_STK_SEND_ENVELOPE_COMMAND] = 69;
  t[RIL_REQUEST_STK_SEND_TERMINAL_RESPONSE] = 70;
  t[RIL_REQUEST_STK_HANDLE_CALL_SETUP_REQUESTED_FROM_SIM] = 71;
  t[RIL_REQUEST_EXPLICIT_CALL_TRANSFER] = 72;
  t[RIL_REQUEST_SET_PREFERRED_NETWORK_TYPE] = 73;
  t[RIL_REQUEST_GET_PREFERRED_NETWORK_TYPE] = 74;
  t[RIL_REQUEST_GET_NEIGHBORING_CELL_IDS] = 75;
  t[RIL_REQUEST_SET_LOCATION_UPDATES] = 76;
  t[RIL_REQUEST_CDMA_SET_SUBSCRIPTION] = 77;
  t[RIL_REQUEST_CDMA_SET_ROAMING_PREFERENCE] = 78;
  t[RIL_REQUEST_CDMA_QUERY_ROAMING_PREFERENCE] = 79;
  t[RIL_REQUEST_SET_TTY_MODE] = 80;
  t[RIL_REQUEST_QUERY_TTY_MODE] = 81;
  t[RIL_REQUEST_CDMA_SET_PREFERRED_VOICE_PRIVACY_MODE] = 82;
  t[RIL_REQUEST_CDMA_QUERY_PREFERRED_VOICE_PRIVACY_MODE] = 83;
  t[RIL_REQUEST_CDMA_FLASH] = 84;
  t[RIL_REQUEST_CDMA_BURST_DTMF] = 85;
  t[RIL_REQUEST_CDMA_VALIDATE_AND_WRITE_AKEY] = 86;
  t[RIL_REQUEST_CDMA_SEND_SMS] = 87;
  t[RIL_REQUEST_CDMA_SMS_ACKNOWLEDGE] = 88;
  t[RIL_REQUEST_GSM_GET_BROADCAST_SMS_CONFIG] = 89;
  t[RIL_REQUEST_GSM_SET_BROADCAST_SMS_CONFIG] = 90;
  t[RIL_REQUEST_GSM_SMS_BROADCAST_ACTIVATION] = 91;
  t[RIL_REQUEST_CDMA_GET_BROADCAST_SMS_CONFIG] = 92;
  t[RIL_REQUEST_CDMA_SET_BROADCAST_SMS_CONFIG] = 93;
  t[RIL_REQUEST_CDMA_SMS_BROADCAST_ACTIVATION] = 94;
  t[RIL_REQUEST_CDMA_SUBSCRIPTION] = 95;
  t[RIL_REQUEST_CDMA_WRITE_SMS_TO_RUIM] = 96;
  t[RIL_REQUEST_CDMA_DELETE_SMS_ON_RUIM] = 97;
  t[RIL_REQUEST_DEVICE_IDENTITY] = 98;
  t[RIL_REQUEST_EXIT_EMERGENCY_CALLBACK_MODE] = 99;
  t[RIL_REQUEST_GET_SMSC_ADDRESS] = 100;
  t[RIL_REQUEST_SET_SMSC_ADDRESS] = 101;
  t[RIL_REQUEST_REPORT_SMS_MEMORY_STATUS] = 102;
  t[RIL_REQUEST_REPORT_STK_SERVICE_IS_RUNNING] = 103;
  t[RIL_UNSOL_RESPONSE_BASE] = 1000;
  t[RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED] = {
    packType: p.noPack,
    unpackType: p.intUnpack
  };
  t[RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED] = 1001;
  t[RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED] = 1002;
  t[RIL_UNSOL_RESPONSE_NEW_SMS] = 1003;
  t[RIL_UNSOL_RESPONSE_NEW_SMS_STATUS_REPORT] = 1004;
  t[RIL_UNSOL_RESPONSE_NEW_SMS_ON_SIM] = 1005;
  t[RIL_UNSOL_ON_USSD] = 1006;
  t[RIL_UNSOL_ON_USSD_REQUEST] = 1007;
  t[RIL_UNSOL_NITZ_TIME_RECEIVED] = 1008;
  t[RIL_UNSOL_SIGNAL_STRENGTH] = 1009;
  t[RIL_UNSOL_DATA_CALL_LIST_CHANGED] = 1010;
  t[RIL_UNSOL_SUPP_SVC_NOTIFICATION] = 1011;
  t[RIL_UNSOL_STK_SESSION_END] = 1012;
  t[RIL_UNSOL_STK_PROACTIVE_COMMAND] = 1013;
  t[RIL_UNSOL_STK_EVENT_NOTIFY] = 1014;
  t[RIL_UNSOL_STK_CALL_SETUP] = 1015;
  t[RIL_UNSOL_SIM_SMS_STORAGE_FULL] = 1016;
  t[RIL_UNSOL_SIM_REFRESH] = 1017;
  t[RIL_UNSOL_CALL_RING] = 1018;
  t[RIL_UNSOL_RESPONSE_SIM_STATUS_CHANGED] = 1019;
  t[RIL_UNSOL_RESPONSE_CDMA_NEW_SMS] = 1020;
  t[RIL_UNSOL_RESPONSE_NEW_BROADCAST_SMS] = 1021;
  t[RIL_UNSOL_CDMA_RUIM_SMS_STORAGE_FULL] = 1022;
  t[RIL_UNSOL_RESTRICTED_STATE_CHANGED] = 1023;
  t[RIL_UNSOL_ENTER_EMERGENCY_CALLBACK_MODE] = 1024;
  t[RIL_UNSOL_CDMA_CALL_WAITING] = 1025;
  t[RIL_UNSOL_CDMA_OTA_PROVISION_STATUS] = 1026;
  t[RIL_UNSOL_CDMA_INFO_REC] = 1027;
  t[RIL_UNSOL_OEM_HOOK_RAW] = 1028;
  t[RIL_UNSOL_RINGBACK_TONE] = 1029;
  t[RIL_UNSOL_RESEND_INCALL_MUTE] = 1030;

})();
