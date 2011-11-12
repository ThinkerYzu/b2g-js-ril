/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


function RILManager() {


    var currentData = null;
    var currentLength = 0;
    var sendFunc = null;

    function flipEndianess(data) {
        return (data[3] | data[2] << 8 | data[1] << 16 | data[0] << 24);
    }

    return {
        tokenGen: 1,
        outstanding_messages: [],
        callbacks: [],
        sendCommand : function (request_type, data) {
            let p = new RILParcel();
            p.setRequestType(request_type);
            p.token = this.tokenGen++;
            p.data = data;
            let buff_length = p.pack();
            let buff = ArrayBuffer(12 + buff_length);
            let parcel_length = Uint32Array(buff, 0, 3);
            parcel_length[0] = 8 + buff_length;
            parcel_length[0] = flipEndianess(Uint8Array(buff, 0, 4));
            parcel_length[1] = p.request_type;
            parcel_length[2] = p.token;
            if(buff_length > 0) {
                Uint8Array(buff, 12, buff_length).set(Uint8Array(p.buffer));
            }
            this.sendFunc(buff);
            this.outstanding_messages[p.token] = p;
        },
        setSendFunc : function(f) {
            this.sendFunc = f;
        },
        receive: function (data) {
            let offset = 0;
            currentLength = flipEndianess(Uint8Array(data, offset, 4));
            offset += 4;
            if(data.length != currentLength + 4) {
                console.print("Write the state machine");
            }
            currentData = ArrayBuffer(currentLength);
            // Quick way of setting a Typed Array to the values of a regular array.
            Uint8Array(currentData).set(data.slice(4, currentLength));
            p = new RILParcel(currentData);
            if(p.response_type == 0) {
                // match to our outgoing via token
                if(!(p.token in this.outstanding_messages)) {
                    throw "Cannot find outgoing message of token " + p.token;
                }
                // get type of outgoing
                let old = this.outstanding_messages.splice(this.outstanding_messages.indexOf(p.token), 1)[0];
                // run callbacks for outgoing type
                p.setRequestType(old.request_type);
                console.print("Reply to " + p.request_name);
            }
            p.unpack();
            // run this.callbacks for unsolicited
            if(p.request_type in this.callbacks) {
                for each(let f in this.callbacks[p.request_type]){
                    f(p.data);
                }
            }
            else {
                console.print("No this.callbacks for " + p.request_name);
            }
        },

        send: function (parcel) {
            
        },
        addCallback: function (request_type, f){
            if(!(request_type in this.callbacks))
                this.callbacks[request_type] = [];            
            this.callbacks[request_type].push(f);
        }
    };
}

