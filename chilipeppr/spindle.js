/* global macro chilipeppr $ */
// Watch onComplete and start spindle over DC Spindle Controller
var SpindleControlMacro = {
	gcode: null, // holds our gcode
	arduinoSerialPort: "/dev/ttyUSB2", // we send laser cmds to Arduino
	init: function() {
		// Uninit previous runs to unsubscribe correctly, i.e.
		// so we don't subscribe 100's of times each time we modify
		// and run this macro
		if (window["SpindleControlMacro"]) {
			macro.status("This macro was run before. Cleaning up...");
			window["SpindleControlMacro"].uninit();
		}
		macro.status("Starting spindle control");
		// subscribe to onComplete
		chilipeppr.subscribe("/com-chilipeppr-widget-serialport/onComplete", this, this.onComplete);
		// store macro in window object so we have it next time thru
		window["SpindleControlMacro"] = this;
		this.getGcode();
	},
	uninit: function() {
		macro.status("Uninitting macro.");
		chilipeppr.unsubscribe("/com-chilipeppr-widget-serialport/onComplete", this.onComplete);
	},
	getGcode: function() {
		chilipeppr.subscribe("/com-chilipeppr-widget-gcode/recvGcode", this, this.getGcodeCallback);
		chilipeppr.publish("/com-chilipeppr-widget-gcode/requestGcode", "");
		chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/recvGcode", this.getGcodeCallback);
	},
	getGcodeCallback: function(data) {
		this.gcode = data;
	},
	onComplete: function(data) {
		// macro.status("Got onCompleted. data:" + JSON.stringify(data));
		// Id's from the Gcode widget always start with g
		// If you jog, use the serial port console, or do other stuff we'll 
		// see callbacks too, but we only want real gcode data here
		if (data.Id.match(/^g(\d+)/)) {
			// $1 is populated with digits from the .match regex above
			var index = parseInt(RegExp.$1, 10); 
			// our id is always 1 ahead of the gcode.lines array index, i.e.
			// line 1 in the widget is this.gcode.lines[0]
			var gcodeline = this.gcode.lines[index - 1];
			
			// Try to match M3, M5, and M30 (program end)
			// The \b is a word boundary so looking for M3 doesn't also
			// hit on M30
			if (gcodeline.match(/\bM3\b/i)) {
				macro.status("Spindle Off from line <" + gcodeline +">");
				chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", "send " + this.arduinoSerialPort + " brk\n");
			} else if (gcodeline.match(/\bM5\b/i)) {
				macro.status("Spindle On from line <" + gcodeline +">");
				chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", "send " + this.arduinoSerialPort + " fwd 400\n");
			} else if (gcodeline.match(/\bM30\b/i)) {
				macro.status("Done running our gcode. Spindle off.");
				chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", "send " + this.arduinoSerialPort + " brk\n");
				this.uninit();
			}
			
		}
	}
}
