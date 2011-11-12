/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


function RILManager() {
    var outstanding_messages = [];
    var tokenGen = 1;
    var currentData = null;
    var currentLength = 0;

    function nltoh(d, offset) {
        let data = Uint8Array(d, offset, 4);
        return (data[3] | data[2] << 8 | data[1] << 16 | data[0] << 24);
    }

    return {
        callbacks: [],
        receiveData: function receiveData(data) {
            let offset = 0;
            currentLength = nltoh(data, offset);
            offset += 4;
            if(data.length != currentLength + 4) {
                console.print("Write the state machine");
            }
            currentData = ArrayBuffer(currentLength);
            // Quick way of setting a Typed Array to the values of a regular array.
            Uint8Array(currentData).set(data.slice(4, currentLength));
            p = new RILParcel(currentData);
            p.unpack();
            if(p.response_type == 0) {
                // match to our outgoing via token
                
                
                // get type of outgoing
                // run callbacks for outgoing type
            }
            else {
                // run this.callbacks for unsolicited
                console.print(p.request_type);
                console.print(this.callbacks[p.request_type]);
                console.print(p.request_type in this.callbacks);
                if(p.request_type in this.callbacks) {
                    for(f in this.callbacks[p.request_type]){
                        console.print("Running!");
                        console.print(typeof(f));
                        f(data);
                    }
                }
                else {
                    console.print("No this.callbacks for " + p.request_name);
                }
            }
        },

        sendData: function sendData(parcel) {
        },
        addCallback: function (request_type, f){
            console.print(typeof(f));
            console.print(request_type);
            if(!(request_type in this.callbacks))
                this.callbacks[request_type] = [];            
            this.callbacks[request_type] += f;

        }
    };
}

