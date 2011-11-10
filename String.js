var str = "15102204262"


function strToByteArray(s) {
    var buf = ArrayBuffer(s.length * 2);
    var switchedBuf = Uint16Array(buf);
    var i = 0;
    for(i = 0; i < s.length; ++i)
    {
	switchedBuf[i] = s.charCodeAt(i);
    }
    return buf;
}

function byteArrayToStr(s) {
    var buf = Uint16Array(s);
    var st = "";
    var i;
    for(i = 0; i < buf.length; ++i)
    {
	st += String.fromCharCode(buf[i]);
    }
    return st;
}

print(str);
var b = strToByteArray(str);
for (var i=0; i<b.length; i++) {  
  print("Entry " + i + ": " + b[i]);  
}  

print(byteArrayToStr(b))