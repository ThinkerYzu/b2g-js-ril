function RILParcel() {
    // raw data
    var _data = Array();
    var response_type;
    var type;
    var length;
    var serial;
    var _parcel_unpack = function() {
		//Can I do something like { type, length, ... } = Int32Array(...)?
		var parse_array = new Int32Array(_data, 0, 3);
		this.response_type = parse_array[0];
		this.type = parse_array[1];
		this.serial = parse_array[2];
    };
};

function IntegerListParcel() {
    var pack = function() {};
    var unpack = function() {};
};

function StringListParcel() {
    var pack = function() {};
    var unpack = function() {};
};

function VoidParcel() {
    var pack = function() {};
    var unpack = function() {};
};

IntegerListParcel.prototype = RILParcel.prototype;
StringListParcel.prototype = RILParcel.prototype;
VoidParcel.prototype = RILParcel.prototype;
