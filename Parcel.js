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
     * ArrayBuffer representing the bytes for the parcel.
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
    offset: null,

    baseUnpack: function () {
        // Solicited parcels look like [response_type = 0, serial]
        // Unsolicited parcels look like [response_type != 0, request_type]
        let arg;
        console.print("Buffer " + this.buffer);
        [this.response_type, arg] = new Int32Array(this.buffer, 0, 2);
        this.offset += 8;
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
    },
    strToByteArray: function(s) {
        var buf = ArrayBuffer(s.length * 2);
        var switchedBuf = Uint16Array(buf);
        var i = 0;
        for(i = 0; i < s.length; ++i)
        {
	          switchedBuf[i] = s.charCodeAt(i);
        }
        return buf;
    },
    byteArrayToStr: function (s) {
        var st = "";
        for (x in Uint16Array(s)) st += String.fromCharCode(x);
        return st;
    },
    voidUnpack: function () {
        this.data = [];
    },
    voidPack: function () {
        // nop
    },
    noUnpack: function () {
        throw "Parcel type does not allow for unpacking";
    },
    noPack: function () {
        throw "Parcel type does not allow for packing";
    },
    stringUnpack: function () {
        this.data = byteArrayToStr(this.buffer);
    },
    stringPack: function () {
        this.buffer = strToByteArray(this.data);
    },
    intUnpack: function() {
        this.data = Int32Array(this.buffer, 8, 1)[0];
    },
    intPack: function() {
        this.buffer = ArrayBuffer(4);
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
  t[RIL_REQUEST_ENTER_SIM_PIN] = null;
  t[RIL_REQUEST_ENTER_SIM_PUK] = null;
  t[RIL_REQUEST_ENTER_SIM_PIN2] = null;
  t[RIL_REQUEST_ENTER_SIM_PUK2] = null;
  t[RIL_REQUEST_CHANGE_SIM_PIN] = null;
  t[RIL_REQUEST_CHANGE_SIM_PIN2] = null;
  t[RIL_REQUEST_ENTER_NETWORK_DEPERSONALIZATION] = null;
  t[RIL_REQUEST_GET_CURRENT_CALLS] = null;
  t[RIL_REQUEST_DIAL] = null;
  t[RIL_REQUEST_GET_IMSI] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_HANGUP] = null;
  t[RIL_REQUEST_HANGUP_WAITING_OR_BACKGROUND] = null;
  t[RIL_REQUEST_HANGUP_FOREGROUND_RESUME_BACKGROUND] = null;
  t[RIL_REQUEST_SWITCH_WAITING_OR_HOLDING_AND_ACTIVE] = null;
  t[RIL_REQUEST_SWITCH_HOLDING_AND_ACTIVE] = null;
  t[RIL_REQUEST_CONFERENCE] = null;
  t[RIL_REQUEST_UDUB] = null;
  t[RIL_REQUEST_LAST_CALL_FAIL_CAUSE] = null;
  t[RIL_REQUEST_SIGNAL_STRENGTH] = null;
  t[RIL_REQUEST_REGISTRATION_STATE] = null;
  t[RIL_REQUEST_GPRS_REGISTRATION_STATE] = null;
  t[RIL_REQUEST_OPERATOR] = null;
  t[RIL_REQUEST_RADIO_POWER] = null;
  t[RIL_REQUEST_DTMF] = null;
  t[RIL_REQUEST_SEND_SMS] = null;
  t[RIL_REQUEST_SEND_SMS_EXPECT_MORE] = null;
  t[RIL_REQUEST_SETUP_DATA_CALL] = null;
  t[RIL_REQUEST_SIM_IO] = null;
  t[RIL_REQUEST_SEND_USSD] = null;
  t[RIL_REQUEST_CANCEL_USSD] = null;
  t[RIL_REQUEST_GET_CLIR] = null;
  t[RIL_REQUEST_SET_CLIR] = null;
  t[RIL_REQUEST_QUERY_CALL_FORWARD_STATUS] = null;
  t[RIL_REQUEST_SET_CALL_FORWARD] = null;
  t[RIL_REQUEST_QUERY_CALL_WAITING] = null;
  t[RIL_REQUEST_SET_CALL_WAITING] = null;
  t[RIL_REQUEST_SMS_ACKNOWLEDGE] = null;
  t[RIL_REQUEST_GET_IMEI] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_GET_IMEISV] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_ANSWER] = null;
  t[RIL_REQUEST_DEACTIVATE_DATA_CALL] = null;
  t[RIL_REQUEST_QUERY_FACILITY_LOCK] = null;
  t[RIL_REQUEST_SET_FACILITY_LOCK] = null;
  t[RIL_REQUEST_CHANGE_BARRING_PASSWORD] = null;
  t[RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE] = null;
  t[RIL_REQUEST_SET_NETWORK_SELECTION_AUTOMATIC] = null;
  t[RIL_REQUEST_SET_NETWORK_SELECTION_MANUAL] = null;
  t[RIL_REQUEST_QUERY_AVAILABLE_NETWORKS] = null;
  t[RIL_REQUEST_DTMF_START] = null;
  t[RIL_REQUEST_DTMF_STOP] = null;
  t[RIL_REQUEST_BASEBAND_VERSION] = {
    packType: p.voidPack,
    unpackType: p.stringUnpack
  };
  t[RIL_REQUEST_SEPARATE_CONNECTION] = null;
  t[RIL_REQUEST_SET_MUTE] = null;
  t[RIL_REQUEST_GET_MUTE] = null;
  t[RIL_REQUEST_QUERY_CLIP] = null;
  t[RIL_REQUEST_LAST_DATA_CALL_FAIL_CAUSE] = null;
  t[RIL_REQUEST_DATA_CALL_LIST] = null;
  t[RIL_REQUEST_RESET_RADIO] = null;
  t[RIL_REQUEST_OEM_HOOK_RAW] = null;
  t[RIL_REQUEST_OEM_HOOK_STRINGS] = null;
  t[RIL_REQUEST_SCREEN_STATE] = null;
  t[RIL_REQUEST_SET_SUPP_SVC_NOTIFICATION] = null;
  t[RIL_REQUEST_WRITE_SMS_TO_SIM] = null;
  t[RIL_REQUEST_DELETE_SMS_ON_SIM] = null;
  t[RIL_REQUEST_SET_BAND_MODE] = null;
  t[RIL_REQUEST_QUERY_AVAILABLE_BAND_MODE] = null;
  t[RIL_REQUEST_STK_GET_PROFILE] = null;
  t[RIL_REQUEST_STK_SET_PROFILE] = null;
  t[RIL_REQUEST_STK_SEND_ENVELOPE_COMMAND] = null;
  t[RIL_REQUEST_STK_SEND_TERMINAL_RESPONSE] = null;
  t[RIL_REQUEST_STK_HANDLE_CALL_SETUP_REQUESTED_FROM_SIM] = null;
  t[RIL_REQUEST_EXPLICIT_CALL_TRANSFER] = null;
  t[RIL_REQUEST_SET_PREFERRED_NETWORK_TYPE] = null;
  t[RIL_REQUEST_GET_PREFERRED_NETWORK_TYPE] = null;
  t[RIL_REQUEST_GET_NEIGHBORING_CELL_IDS] = null;
  t[RIL_REQUEST_SET_LOCATION_UPDATES] = null;
  t[RIL_REQUEST_CDMA_SET_SUBSCRIPTION] = null;
  t[RIL_REQUEST_CDMA_SET_ROAMING_PREFERENCE] = null;
  t[RIL_REQUEST_CDMA_QUERY_ROAMING_PREFERENCE] = null;
  t[RIL_REQUEST_SET_TTY_MODE] = null;
  t[RIL_REQUEST_QUERY_TTY_MODE] = null;
  t[RIL_REQUEST_CDMA_SET_PREFERRED_VOICE_PRIVACY_MODE] = null;
  t[RIL_REQUEST_CDMA_QUERY_PREFERRED_VOICE_PRIVACY_MODE] = null;
  t[RIL_REQUEST_CDMA_FLASH] = null;
  t[RIL_REQUEST_CDMA_BURST_DTMF] = null;
  t[RIL_REQUEST_CDMA_VALIDATE_AND_WRITE_AKEY] = null;
  t[RIL_REQUEST_CDMA_SEND_SMS] = null;
  t[RIL_REQUEST_CDMA_SMS_ACKNOWLEDGE] = null;
  t[RIL_REQUEST_GSM_GET_BROADCAST_SMS_CONFIG] = null;
  t[RIL_REQUEST_GSM_SET_BROADCAST_SMS_CONFIG] = null;
  t[RIL_REQUEST_GSM_SMS_BROADCAST_ACTIVATION] = null;
  t[RIL_REQUEST_CDMA_GET_BROADCAST_SMS_CONFIG] = null;
  t[RIL_REQUEST_CDMA_SET_BROADCAST_SMS_CONFIG] = null;
  t[RIL_REQUEST_CDMA_SMS_BROADCAST_ACTIVATION] = null;
  t[RIL_REQUEST_CDMA_SUBSCRIPTION] = null;
  t[RIL_REQUEST_CDMA_WRITE_SMS_TO_RUIM] = null;
  t[RIL_REQUEST_CDMA_DELETE_SMS_ON_RUIM] = null;
  t[RIL_REQUEST_DEVICE_IDENTITY] = null;
  t[RIL_REQUEST_EXIT_EMERGENCY_CALLBACK_MODE] = null;
  t[RIL_REQUEST_GET_SMSC_ADDRESS] = null;
  t[RIL_REQUEST_SET_SMSC_ADDRESS] = null;
  t[RIL_REQUEST_REPORT_SMS_MEMORY_STATUS] = null;
  t[RIL_REQUEST_REPORT_STK_SERVICE_IS_RUNNING] = null;
  t[RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED] = {
    packType: p.noPack,
    unpackType: p.intUnpack
  };
  t[RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED] = null;
  t[RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED] = null;
  t[RIL_UNSOL_RESPONSE_NEW_SMS] = null;
  t[RIL_UNSOL_RESPONSE_NEW_SMS_STATUS_REPORT] = null;
  t[RIL_UNSOL_RESPONSE_NEW_SMS_ON_SIM] = null;
  t[RIL_UNSOL_ON_USSD] = null;
  t[RIL_UNSOL_ON_USSD_REQUEST] = null;
  t[RIL_UNSOL_NITZ_TIME_RECEIVED] = null;
  t[RIL_UNSOL_SIGNAL_STRENGTH] = null;
  t[RIL_UNSOL_DATA_CALL_LIST_CHANGED] = null;
  t[RIL_UNSOL_SUPP_SVC_NOTIFICATION] = null;
  t[RIL_UNSOL_STK_SESSION_END] = null;
  t[RIL_UNSOL_STK_PROACTIVE_COMMAND] = null;
  t[RIL_UNSOL_STK_EVENT_NOTIFY] = null;
  t[RIL_UNSOL_STK_CALL_SETUP] = null;
  t[RIL_UNSOL_SIM_SMS_STORAGE_FULL] = null;
  t[RIL_UNSOL_SIM_REFRESH] = null;
  t[RIL_UNSOL_CALL_RING] = null;
  t[RIL_UNSOL_RESPONSE_SIM_STATUS_CHANGED] = null;
  t[RIL_UNSOL_RESPONSE_CDMA_NEW_SMS] = null;
  t[RIL_UNSOL_RESPONSE_NEW_BROADCAST_SMS] = null;
  t[RIL_UNSOL_CDMA_RUIM_SMS_STORAGE_FULL] = null;
  t[RIL_UNSOL_RESTRICTED_STATE_CHANGED] = null;
  t[RIL_UNSOL_ENTER_EMERGENCY_CALLBACK_MODE] = null;
  t[RIL_UNSOL_CDMA_CALL_WAITING] = null;
  t[RIL_UNSOL_CDMA_OTA_PROVISION_STATUS] = null;
  t[RIL_UNSOL_CDMA_INFO_REC] = null;
  t[RIL_UNSOL_OEM_HOOK_RAW] = null;
  t[RIL_UNSOL_RINGBACK_TONE] = null;
  t[RIL_UNSOL_RESEND_INCALL_MUTE] = null;

})();
