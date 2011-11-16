/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
* Temporary service for sending audio requests to b2g-audio-daemon.
* For the time being, the audio daemon only requires an int32
* representing an audio function code.  More details about this audio 
* functions can be found at https://github.com/ferjm/b2g-audio-daemon
*
* It requires socket.js
* 
* Use: 
*     AudioManager.send(AUDIO_REQUEST_FORCE_COMMUNICATION);
*/

// Audio functions code
const AUDIO_REQUEST_FORCE_COMMUNICATION = 2000;
const AUDIO_REQUEST_SPEAKER_ON_OFF  = 2001;
const AUDIO_REQUEST_MIC_MUTE_UNMUTE = 2002;
const AUDIO_REQUEST_MODE_NORMAL = 2003;
  
var AudioManager = (function (host, port) {

	function AudioSocketSender() {}

	AudioSocketSender.prototype = {

		connect: function connect(host, port) {
			this.socket = gTransportService.createTransport(null, 0, host, port, null);
			this.outputStream = this.socket.openOutputStream(0, 0, 0);
			this.binaryOutputStream = BinaryOutputStream(this.outputStream);    
		},

		stop: function stop() {
			console.print("Stopping audio socket");
			this.socket.close(0);
		},

		send: function send(array_buffer) {
			let byte_array = Uint8Array(array_buffer);
			this.binaryOutputStream.writeByteArray([x for each (x in byte_array)], byte_array.length);
			this.binaryOutputStream.flush();
		}

	}

	let audioSocketSender = new AudioSocketSender (host, port);  
  audioSocketSender.connect (host, port);

	return {
		send : function(request_type) {
			let buff = ArrayBuffer(4);
			let request = new Int32Array(buff);
			request[0] = request_type;
			audioSocketSender.send(buff);
		}
	}

})('localhost', 6667);

