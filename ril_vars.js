/**
 * Copyright (C) 2010 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * constiables from ril.h
 */

/**
 * RIL Error codes
 */
const RIL_E_SUCCESS = 0;
const RIL_E_RADIO_NOT_AVAILABLE = 1;     /* If radio did not start or is resetting */
const RIL_E_GENERIC_FAILURE = 2;
const RIL_E_PASSWORD_INCORRECT = 3;      /* for PIN/PIN2 methods only! */
const RIL_E_SIM_PIN2 = 4;                /* Operation requires SIM PIN2 to be entered */
const RIL_E_SIM_PUK2 = 5;                /* Operation requires SIM PIN2 to be entered */
const RIL_E_REQUEST_NOT_SUPPORTED = 6;
const RIL_E_CANCELLED = 7;
const RIL_E_OP_NOT_ALLOWED_DURING_VOICE_CALL = 8; /* data ops are not allowed during voice
                                                   call on a Class C GPRS device */
const RIL_E_OP_NOT_ALLOWED_BEFORE_REG_TO_NW = 9;  /* data ops are not allowed before device
                                                   registers in network */
const RIL_E_SMS_SEND_FAIL_RETRY = 10;             /* fail to send sms and need retry */
const RIL_E_SIM_ABSENT = 11;                      /* fail to set the location where CDMA subscription
                                                   shall be retrieved because of SIM or RUIM
                                                   card absent */
const RIL_E_SUBSCRIPTION_NOT_AVAILABLE = 12;      /* fail to find CDMA subscription from specified
                                                   location */
const RIL_E_MODE_NOT_SUPPORTED = 13;              /* HW does not support preferred network type */
const RIL_E_FDN_CHECK_FAILURE = 14;               /* command failed because recipient is not on FDN
                                                   list */
const RIL_E_ILLEGAL_SIM_OR_ME = 15;               /* network selection failed due to */

const CARD_MAX_APPS = 8;

/**
 * Icc card state
 */
const CARDSTATE_ABSENT   = 0;
const CARDSTATE_PRESENT  = 1;
const CARDSTATE_ERROR    = 2;

/**
 * RIL_PersoSubState
 */
const PERSOSUBSTATE_UNKNOWN                   = 0; /* initial state */
const PERSOSUBSTATE_IN_PROGRESS               = 1; /* in between each lock transition */
const PERSOSUBSTATE_READY                     = 2; /* when either SIM or RUIM Perso is finished
                                                    since each app can only have 1 active perso
                                                    involved */
const PERSOSUBSTATE_SIM_NETWORK               = 3;
const PERSOSUBSTATE_SIM_NETWORK_SUBSET        = 4;
const PERSOSUBSTATE_SIM_CORPORATE             = 5;
const PERSOSUBSTATE_SIM_SERVICE_PROVIDER      = 6;
const PERSOSUBSTATE_SIM_SIM                   = 7;
const PERSOSUBSTATE_SIM_NETWORK_PUK           = 8; /* The corresponding perso lock is blocked */
const PERSOSUBSTATE_SIM_NETWORK_SUBSET_PUK    = 9;
const PERSOSUBSTATE_SIM_CORPORATE_PUK         = 10;
const PERSOSUBSTATE_SIM_SERVICE_PROVIDER_PUK  = 11;
const PERSOSUBSTATE_SIM_SIM_PUK               = 12;
const PERSOSUBSTATE_RUIM_NETWORK1             = 13;
const PERSOSUBSTATE_RUIM_NETWORK2             = 14;
const PERSOSUBSTATE_RUIM_HRPD                 = 15;
const PERSOSUBSTATE_RUIM_CORPORATE            = 16;
const PERSOSUBSTATE_RUIM_SERVICE_PROVIDER     = 17;
const PERSOSUBSTATE_RUIM_RUIM                 = 18;
const PERSOSUBSTATE_RUIM_NETWORK1_PUK         = 19; /* The corresponding perso lock is blocked */
const PERSOSUBSTATE_RUIM_NETWORK2_PUK         = 20;
const PERSOSUBSTATE_RUIM_HRPD_PUK             = 21;
const PERSOSUBSTATE_RUIM_CORPORATE_PUK        = 22;
const PERSOSUBSTATE_RUIM_SERVICE_PROVIDER_PUK = 23;
const PERSOSUBSTATE_RUIM_RUIM_PUK             = 24;

/**
 * RIL_AppState
 */
const APPSTATE_UNKNOWN               = 0;
const APPSTATE_DETECTED              = 1;
const APPSTATE_PIN                   = 2; /* If PIN1 or UPin is required */
const APPSTATE_PUK                   = 3; /* If PUK1 or Puk for UPin is required */
const APPSTATE_SUBSCRIPTION_PERSO    = 4; /* perso_substate should be look at
                                           when app_state is assigned to this value */
const APPSTATE_READY                 = 5;

/**
 * RIL_PinState
 */
const PINSTATE_UNKNOWN              = 0;
const PINSTATE_ENABLED_NOT_VERIFIED = 1;
const PINSTATE_ENABLED_VERIFIED     = 2;
const PINSTATE_DISABLED             = 3;
const PINSTATE_ENABLED_BLOCKED      = 4;
const PINSTATE_ENABLED_PERM_BLOCKED = 5;

/**
 * RIL_AppType
 */
const APPTYPE_UNKNOWN = 0;
const APPTYPE_SIM     = 1;
const APPTYPE_USIM    = 2;
const APPTYPE_RUIM    = 3;
const APPTYPE_CSIM    = 4;

/**
 * RIL_CallState
 */
const CALLSTATE_ACTIVE = 0;
const CALLSTATE_HOLDING = 1;
const CALLSTATE_DIALING = 2;                           /* MO call only */
const CALLSTATE_ALERTING = 3;                          /* MO call only */
const CALLSTATE_INCOMING = 4;                          /* MT call only */
const CALLSTATE_WAITING = 5;                           /* MT call only */

/**
 * RIL_RadioState
 */
const RADIOSTATE_OFF = 0;                   /* Radio explictly powered off (eg CFUN=0) */
const RADIOSTATE_UNAVAILABLE = 1;           /* Radio unavailable (eg, resetting or not booted) */
const RADIOSTATE_SIM_NOT_READY = 2;         /* Radio is on, but the SIM interface is not ready */
const RADIOSTATE_SIM_LOCKED_OR_ABSENT = 3;  /* SIM PIN locked, PUK required, network
                                              personalization locked; or SIM absent */
const RADIOSTATE_SIM_READY = 4;             /* Radio is on and SIM interface is available */
const RADIOSTATE_RUIM_NOT_READY = 5;        /* Radio is on, but the RUIM interface is not ready */
const RADIOSTATE_RUIM_READY = 6;            /* Radio is on and the RUIM interface is available */
const RADIOSTATE_RUIM_LOCKED_OR_ABSENT = 7; /* RUIM PIN locked, PUK required, networ
                                              personalization locked; or RUIM absent */
const RADIOSTATE_NV_NOT_READY = 8;          /* Radio is on, but the NV interface is not available */
const RADIOSTATE_NV_READY = 9;              /* Radio is on and the NV interface is available */

/**
 * Last call fail cause
 */
const CALL_FAIL_UNOBTAINABLE_NUMBER = 1;
const CALL_FAIL_NORMAL = 16;
const CALL_FAIL_BUSY = 17;
const CALL_FAIL_CONGESTION = 34;
const CALL_FAIL_ACM_LIMIT_EXCEEDED = 68;
const CALL_FAIL_CALL_BARRED = 240;
const CALL_FAIL_FDN_BLOCKED = 241;
const CALL_FAIL_IMSI_UNKNOWN_IN_VLR = 242;
const CALL_FAIL_IMEI_NOT_ACCEPTED = 243;
const CALL_FAIL_CDMA_LOCKED_UNTIL_POWER_CYCLE = 1000;
const CALL_FAIL_CDMA_DROP = 1001;
const CALL_FAIL_CDMA_INTERCEPT = 1002;
const CALL_FAIL_CDMA_REORDER = 1003;
const CALL_FAIL_CDMA_SO_REJECT = 1004;
const CALL_FAIL_CDMA_RETRY_ORDER = 1005;
const CALL_FAIL_CDMA_ACCESS_FAILURE = 1006;
const CALL_FAIL_CDMA_PREEMPTED = 1007;
const CALL_FAIL_CDMA_NOT_EMERGENCY = 1008; /* For non-emergency number dialed during emergency callback mode */
const CALL_FAIL_CDMA_ACCESS_BLOCKED = 1009; /* CDMA network access probes blocked */
const CALL_FAIL_ERROR_UNSPECIFIED = 0xffff;

/**
 * RIL requests
 */
const RIL_REQUEST_GET_SIM_STATUS = 1;
const RIL_REQUEST_ENTER_SIM_PIN = 2;
const RIL_REQUEST_ENTER_SIM_PUK = 3;
const RIL_REQUEST_ENTER_SIM_PIN2 = 4;
const RIL_REQUEST_ENTER_SIM_PUK2 = 5;
const RIL_REQUEST_CHANGE_SIM_PIN = 6;
const RIL_REQUEST_CHANGE_SIM_PIN2 = 7;
const RIL_REQUEST_ENTER_NETWORK_DEPERSONALIZATION = 8;
const RIL_REQUEST_GET_CURRENT_CALLS = 9;
const RIL_REQUEST_DIAL = 10;
const RIL_REQUEST_GET_IMSI = 11;
const RIL_REQUEST_HANGUP = 12;
const RIL_REQUEST_HANGUP_WAITING_OR_BACKGROUND = 13;
const RIL_REQUEST_HANGUP_FOREGROUND_RESUME_BACKGROUND = 14;
const RIL_REQUEST_SWITCH_WAITING_OR_HOLDING_AND_ACTIVE = 15;
const RIL_REQUEST_SWITCH_HOLDING_AND_ACTIVE = 15;
const RIL_REQUEST_CONFERENCE = 16;
const RIL_REQUEST_UDUB = 17;
const RIL_REQUEST_LAST_CALL_FAIL_CAUSE = 18;
const RIL_REQUEST_SIGNAL_STRENGTH = 19;
const RIL_REQUEST_REGISTRATION_STATE = 20;
const RIL_REQUEST_GPRS_REGISTRATION_STATE = 21;
const RIL_REQUEST_OPERATOR = 22;
const RIL_REQUEST_RADIO_POWER = 23;
const RIL_REQUEST_DTMF = 24;
const RIL_REQUEST_SEND_SMS = 25;
const RIL_REQUEST_SEND_SMS_EXPECT_MORE = 26;
const RIL_REQUEST_SETUP_DATA_CALL = 27;
const RIL_REQUEST_SIM_IO = 28;
const RIL_REQUEST_SEND_USSD = 29;
const RIL_REQUEST_CANCEL_USSD = 30;
const RIL_REQUEST_GET_CLIR = 31;
const RIL_REQUEST_SET_CLIR = 32;
const RIL_REQUEST_QUERY_CALL_FORWARD_STATUS = 33;
const RIL_REQUEST_SET_CALL_FORWARD = 34;
const RIL_REQUEST_QUERY_CALL_WAITING = 35;
const RIL_REQUEST_SET_CALL_WAITING = 36;
const RIL_REQUEST_SMS_ACKNOWLEDGE = 37;
const RIL_REQUEST_GET_IMEI = 38;
const RIL_REQUEST_GET_IMEISV = 39;
const RIL_REQUEST_ANSWER = 40;
const RIL_REQUEST_DEACTIVATE_DATA_CALL = 41;
const RIL_REQUEST_QUERY_FACILITY_LOCK = 42;
const RIL_REQUEST_SET_FACILITY_LOCK = 43;
const RIL_REQUEST_CHANGE_BARRING_PASSWORD = 44;
const RIL_REQUEST_QUERY_NETWORK_SELECTION_MODE = 45;
const RIL_REQUEST_SET_NETWORK_SELECTION_AUTOMATIC = 46;
const RIL_REQUEST_SET_NETWORK_SELECTION_MANUAL = 47;
const RIL_REQUEST_QUERY_AVAILABLE_NETWORKS = 48;
const RIL_REQUEST_DTMF_START = 49;
const RIL_REQUEST_DTMF_STOP = 50;
const RIL_REQUEST_BASEBAND_VERSION = 51;
const RIL_REQUEST_SEPARATE_CONNECTION = 52;
const RIL_REQUEST_SET_MUTE = 53;
const RIL_REQUEST_GET_MUTE = 54;
const RIL_REQUEST_QUERY_CLIP = 55;
const RIL_REQUEST_LAST_DATA_CALL_FAIL_CAUSE = 56;
const RIL_REQUEST_DATA_CALL_LIST = 57;
const RIL_REQUEST_RESET_RADIO = 58;
const RIL_REQUEST_OEM_HOOK_RAW = 59;
const RIL_REQUEST_OEM_HOOK_STRINGS = 60;
const RIL_REQUEST_SCREEN_STATE = 61;
const RIL_REQUEST_SET_SUPP_SVC_NOTIFICATION = 62;
const RIL_REQUEST_WRITE_SMS_TO_SIM = 63;
const RIL_REQUEST_DELETE_SMS_ON_SIM = 64;
const RIL_REQUEST_SET_BAND_MODE = 65;
const RIL_REQUEST_QUERY_AVAILABLE_BAND_MODE = 66;
const RIL_REQUEST_STK_GET_PROFILE = 67;
const RIL_REQUEST_STK_SET_PROFILE = 68;
const RIL_REQUEST_STK_SEND_ENVELOPE_COMMAND = 69;
const RIL_REQUEST_STK_SEND_TERMINAL_RESPONSE = 70;
const RIL_REQUEST_STK_HANDLE_CALL_SETUP_REQUESTED_FROM_SIM = 71;
const RIL_REQUEST_EXPLICIT_CALL_TRANSFER = 72;
const RIL_REQUEST_SET_PREFERRED_NETWORK_TYPE = 73;
const RIL_REQUEST_GET_PREFERRED_NETWORK_TYPE = 74;
const RIL_REQUEST_GET_NEIGHBORING_CELL_IDS = 75;
const RIL_REQUEST_SET_LOCATION_UPDATES = 76;
const RIL_REQUEST_CDMA_SET_SUBSCRIPTION = 77;
const RIL_REQUEST_CDMA_SET_ROAMING_PREFERENCE = 78;
const RIL_REQUEST_CDMA_QUERY_ROAMING_PREFERENCE = 79;
const RIL_REQUEST_SET_TTY_MODE = 80;
const RIL_REQUEST_QUERY_TTY_MODE = 81;
const RIL_REQUEST_CDMA_SET_PREFERRED_VOICE_PRIVACY_MODE = 82;
const RIL_REQUEST_CDMA_QUERY_PREFERRED_VOICE_PRIVACY_MODE = 83;
const RIL_REQUEST_CDMA_FLASH = 84;
const RIL_REQUEST_CDMA_BURST_DTMF = 85;
const RIL_REQUEST_CDMA_VALIDATE_AND_WRITE_AKEY = 86;
const RIL_REQUEST_CDMA_SEND_SMS = 87;
const RIL_REQUEST_CDMA_SMS_ACKNOWLEDGE = 88;
const RIL_REQUEST_GSM_GET_BROADCAST_SMS_CONFIG = 89;
const RIL_REQUEST_GSM_SET_BROADCAST_SMS_CONFIG = 90;
const RIL_REQUEST_GSM_SMS_BROADCAST_ACTIVATION = 91;
const RIL_REQUEST_CDMA_GET_BROADCAST_SMS_CONFIG = 92;
const RIL_REQUEST_CDMA_SET_BROADCAST_SMS_CONFIG = 93;
const RIL_REQUEST_CDMA_SMS_BROADCAST_ACTIVATION = 94;
const RIL_REQUEST_CDMA_SUBSCRIPTION = 95;
const RIL_REQUEST_CDMA_WRITE_SMS_TO_RUIM = 96;
const RIL_REQUEST_CDMA_DELETE_SMS_ON_RUIM = 97;
const RIL_REQUEST_DEVICE_IDENTITY = 98;
const RIL_REQUEST_EXIT_EMERGENCY_CALLBACK_MODE = 99;
const RIL_REQUEST_GET_SMSC_ADDRESS = 100;
const RIL_REQUEST_SET_SMSC_ADDRESS = 101;
const RIL_REQUEST_REPORT_SMS_MEMORY_STATUS = 102;
const RIL_REQUEST_REPORT_STK_SERVICE_IS_RUNNING = 103;

/**
 * RIL unsolicited requests
 */
const RIL_UNSOL_RESPONSE_BASE = 1000;
const RIL_UNSOL_RESPONSE_RADIO_STATE_CHANGED = 1000;
const RIL_UNSOL_RESPONSE_CALL_STATE_CHANGED = 1001;
const RIL_UNSOL_RESPONSE_NETWORK_STATE_CHANGED = 1002;
const RIL_UNSOL_RESPONSE_NEW_SMS = 1003;
const RIL_UNSOL_RESPONSE_NEW_SMS_STATUS_REPORT = 1004;
const RIL_UNSOL_RESPONSE_NEW_SMS_ON_SIM = 1005;
const RIL_UNSOL_ON_USSD = 1006;
const RIL_UNSOL_ON_USSD_REQUEST = 1007;
const RIL_UNSOL_NITZ_TIME_RECEIVED = 1008;
const RIL_UNSOL_SIGNAL_STRENGTH = 1009;
const RIL_UNSOL_DATA_CALL_LIST_CHANGED = 1010;
const RIL_UNSOL_SUPP_SVC_NOTIFICATION = 1011;
const RIL_UNSOL_STK_SESSION_END = 1012;
const RIL_UNSOL_STK_PROACTIVE_COMMAND = 1013;
const RIL_UNSOL_STK_EVENT_NOTIFY = 1014;
const RIL_UNSOL_STK_CALL_SETUP = 1015;
const RIL_UNSOL_SIM_SMS_STORAGE_FULL = 1016;
const RIL_UNSOL_SIM_REFRESH = 1017;
const RIL_UNSOL_CALL_RING = 1018;
const RIL_UNSOL_RESPONSE_SIM_STATUS_CHANGED = 1019;
const RIL_UNSOL_RESPONSE_CDMA_NEW_SMS = 1020;
const RIL_UNSOL_RESPONSE_NEW_BROADCAST_SMS = 1021;
const RIL_UNSOL_CDMA_RUIM_SMS_STORAGE_FULL = 1022;
const RIL_UNSOL_RESTRICTED_STATE_CHANGED = 1023;
const RIL_UNSOL_ENTER_EMERGENCY_CALLBACK_MODE = 1024;
const RIL_UNSOL_CDMA_CALL_WAITING = 1025;
const RIL_UNSOL_CDMA_OTA_PROVISION_STATUS = 1026;
const RIL_UNSOL_CDMA_INFO_REC = 1027;
const RIL_UNSOL_OEM_HOOK_RAW = 1028;
const RIL_UNSOL_RINGBACK_TONE = 1029;
const RIL_UNSOL_RESEND_INCALL_MUTE = 1030;

/**
 * Control commands in ctrl.proto for control server
 */
const CTRL_CMD_GET_RADIO_STATE = 1;
const CTRL_CMD_SET_RADIO_STATE = 2;

/**
 * Control commands in ctrl.proto that will be dispatched to
 * simulatedRadio or simulatedIcc
 */
const CTRL_CMD_DISPATH_BASE             = 1000;
const CTRL_CMD_SET_MT_CALL              = 1001;
const CTRL_CMD_HANGUP_CONN_REMOTE       = 1002;
const CTRL_CMD_SET_CALL_TRANSITION_FLAG = 1003;
const CTRL_CMD_SET_CALL_ALERT           = 1004;
const CTRL_CMD_SET_CALL_ACTIVE          = 1005;
const CTRL_CMD_ADD_DIALING_CALL         = 1006;

/* status for control commands, defined in ctrl.proto */
const CTRL_STATUS_OK = 0;
const CTRL_STATUS_ERR = 1;

/**
 * Local requests from simulated_radio or simulated_icc
 */
const CMD_DELAY_TEST = 2000;
const CMD_UNSOL_SIGNAL_STRENGTH = 2001;
const CMD_UNSOL_CALL_STATE_CHANGED = 2002;    // Send RIL_UNSOL_CALL_STATE_CHANGED
const CMD_CALL_STATE_CHANGE = 2003;           // call state change: dialing->alert->active
const CMD_UNSOL_CALL_RING = 2004;

/**
 * Other constiables
 */
const OUTGOING = 0;       /* outgoing call */
const INCOMING = 1;       /* incoming call */
