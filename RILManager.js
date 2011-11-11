/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


function RILManager() {
    var outstanding_messages = [];
    var tokenGen = 1;
    var currentData = null;
    var currentLength = 0;
    
    function reset() {
        this.outstanding_messages = [];
    }

    function nltoh(d, offset) {
        let data = Uint8Array(d, offset, 4);
        let hl = (data[3] | data[2] << 8 | data[1] << 16 | data[0] << 24);
        console.print("hl is " +hl);
        return hl;
    }
    return {
        receiveData: function receiveData(data) {
            let offset = 0;
            console.print("Data is length " + data.length);
            currentLength = nltoh(data, offset);
            console.print("Expecting parcel of length " + currentLength);
            offset += 4;
            if(data.length != currentLength + 4) {
                console.print("Write the state machine");
            }      
            currentData = ArrayBuffer(currentLength);
            // Quick way of setting a Typed Array to the values of a regular array.
            Uint8Array(currentData).set(data.slice(4, currentLength));
            console.print([x for each (x in currentData)]);
            p = new RILParcel(currentData);
            p.unpack();      
        },

        sendData: function sendData(parcel) {
            
        },
    }
}

