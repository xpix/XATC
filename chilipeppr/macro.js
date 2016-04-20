/* global macro chilipeppr $ */
/* 

============ MACRO XTC (Automatic Tool Changer) ================================

This macro is used for an Automatic Toolchanger. This woll control the used gcode 
and try to find the Toolchnages, use the Toolnumber to identify the correct Toolholder.
This Macro remember on the used tool and find the correct strategie to let the 
actual used tool in the holder and get a new one.

This will parse the comment to get gcode from commandline i.e.:
   M6 T1
  
And then it sends commands to a Arduino+DC Spindle Controller
to pre-poition, tight or loose the ER11 Collet.

To test this with tinyg2 or tinyg follow this steps:
   * use SPJS 1.89
   * use url http://chilipeppr.com/tinyg?v9=true
   * set linenumbers on
   * in tinyg widget set "No init CMD's Mode"
   * choose "tinygg2" in SPJS Widget

*/
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

var myXTCMacro = {
    serialPortXTC:    "/dev/ttyUSB2", // XTC Controlelr
    atcParameters: {
      level:   800,     // the current level in mA where the spindle will break
      revlevel:-3000,   // the reverse level in mA where the spindle will break
      forward: 30,      // value for minimum rpm
      safetyHeight: 35, // safety height
      feedRate: 300,    // Feedrate to move over the catch cable
      nutZ: -7,         // safety deep position of collet in nut
    },
    atcMillHolder: [
      // Center Position holder, catch height, tighten value, how long tighten in milliseconds
      // ---------|-------------|-------------|--------------------------------
      {posX : -235, posY : 26.5,   posZ: 5,   tourque: 300, time: 500}, // first endmill holder
    ],
    feedRate: 100,
    toolnumber: 0,
    pauseline: 0,
	toolinuse: 0,
   action: '',
	init: function() {
      // Uninit previous runs to unsubscribe correctly, i.e.
      // so we don't subscribe 100's of times each time we modify
      // and run this macro
      if (window["myXTCMacro"]) {
         macro.status("This macro was run before. Cleaning up...");
         window["myXTCMacro"].uninit();
         window["myXTCMacro"] = undefined;
      }

      // store macro in window object so we have it next time thru
      window["myXTCMacro"] = this;

      // Check for Automatic Toolchange Command
      chilipeppr.subscribe("/com-chilipeppr-widget-serialport/onComplete", this, this.onComplete);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      
      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace cnccontroller for ATC");
      
      this.getGcode();
   },
   uninit: function() {
      macro.status("Uninitting chilipeppr_pause macro.");
      chilipeppr.unsubscribe("/com-chilipeppr-widget-serialport/onComplete", this, this.onComplete);		
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
   },
   onStateChanged: function(state){
      console.log('ATC State:', state, this);
      this.State = state;
      if(this.State === 'End')
         this.exeLine = 0;
   },
	getGcode: function() {
		chilipeppr.subscribe("/com-chilipeppr-widget-gcode/recvGcode", this, this.getGcodeCallback);
		chilipeppr.publish("/com-chilipeppr-widget-gcode/requestGcode", "");
		chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/recvGcode", this.getGcodeCallback);
	},
	getGcodeCallback: function(data) {
		this.gcode = data;
	},
   // Add control DC Spindle for M3 and M5, M30 will unset all parameters
	onComplete: function(data) {
		console.log('ATC onComplete', data);
		// Id's from the Gcode widget always start with g
		// If you jog, use the serial port console, or do other stuff we'll 
		// see callbacks too, but we only want real gcode data here
		if (data.Id.match(/^g(\d+)/)) {
			// $1 is populated with digits from the .match regex above
			var index = parseInt(RegExp.$1); 
			// our id is always 1 ahead of the gcode.lines array index, i.e.
			// line 1 in the widget is this.gcode.lines[0]
            // Ignore empty lines
			if(this.gcode === undefined)
			   return;

			var gcodeline = this.gcode.lines[index - 1];

            // Ignore empty lines
			if(gcodeline === undefined)
			   return;
			
			// Try to match M3, M5, and M30 (program end)
			// The \b is a word boundary so looking for M3 doesn't also
			// hit on M30
			if (gcodeline.match(/\bM5\b/i) || gcodeline.match(/\bM30\b/i)) {
				// turn spindle off
				chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", "send " + this.serialPortXTC + " brk\n");
			} else if (gcodeline.match(/\bM3\b/i)) {
				// turn spindle on
				chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", "send " + this.serialPortXTC + " fwd 400\n");
			} else if (gcodeline.match(/\bM6\b/i)) {
            if(gcodeline.match(/T(\d+)/)){
                this.onATC({line: index, toolnumber: parseInt(RegExp.$1)});
            }
			}
		}
	},

   setAction: function(status){
      if(this.State != "Stop"){ // wait for stop state
         // console.log('ATC Wait for setAction', status);
         setTimeout(this.setAction.bind(this, status), 250);
         return;
      }
      console.log('ATC Set ACtion status to -->', status);
      this.action = status;
   },

   onATC: function(data){
      console.log('ATC Execute Line:', data);

      // now the machine is in pause mode
      // cuz M6 linenumber are the same as actual linenumber
      // and we can do whatever we like :)
      console.log('ATC Process:', this);

      // Wait for stop and set to idle
      this.setAction('idle');

      this.toolnumber = data.toolnumber;

      // check if a different tool in use
      if(this.toolinuse > 0 && this.toolinuse != this.toolnumber){
        this.atc_move_to_holder(this.toolinuse);     // move to holder ...
        this.atc_loose();                            // put tool in holder
      }
     
      // get new tool from holder, if neccessary
      if(this.toolnumber > 0){
        this.atc_move_to_holder(this.toolnumber);    // move to holder ...
        this.atc_tight();                            // get tool from holder
      }
      
      this.unpauseGcode();
   },

   atc_move_to_holder: function( toolnumber ){
      // wait on main cnccontroller's stop state (think asynchron!)
      if(this.action != "idle"){ // wait for idle state
         // console.log('ATC Wait for idle', 'atc_move_to_holder');
         setTimeout(this.atc_move_to_holder.bind(this, toolnumber), 250);
         return;
      }

      console.log('ATC called: ', 'atc_move_to_holder', toolnumber);

      // get parameters for millholder
      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (toolnumber-1) ]; 

      if($.type(holder) !== 'object')
         return;

      // start spindle very slow and set current level
      var cmd = "send " 
                  + this.serialPortXTC + " " 
                  + "fwd " + (atcparams.forward+100) + "\n" 
                  + "fwd " + atcparams.forward + "\n" 
                  + "lev " + atcparams.level + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // now move spindle to the holder position
      // first to safetyHeight ...
      cmd += "G0 Z" + atcparams.safetyHeight + "\n";
      // then to holder center ...
      cmd += "G0 X" + holder.posX + " Y" + holder.posY + "\n"; 
      // then to holder Z pre-position height ...
      cmd += "G0 Z" + holder.posZ + "\n";
      // slowly to the minus end ollet Z position  ...
      cmd += "G0 Z" + atcparams.nutZ + " F" + atcparams.feedRate + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);

      setTimeout(this.setAction.bind(this, 'moved'), 250); // wait for stop and set status
   },

   atc_sec_height: function(){
      if(this.action != "tighten" && this.action != "loosed"){ // wait for moved state
         // console.log('ATC Wait for tighten/loosed', 'atc_sec_height');
         setTimeout(this.atc_sec_height.bind(this), 250);
         return;
      }

      console.log('ATC called: ', 'atc_sec_height');

      var cmd = "G0 Z" + this.atcParameters.safetyHeight + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);
      setTimeout(this.setAction.bind(this, 'idle'), 250); // wait for stop and set status
   },

   atc_loose: function(){
      // wait on main cnccontroller's stop state (think asynchron!)
      if(this.action != "moved"){ // wait for moved state
         // console.log('ATC Wait for moved', 'atc_loose');
         setTimeout(this.atc_loose.bind(this), 250);
         return;
      }

      // ok action == moved, now we can loose nut and move the machine 
      console.log('ATC called: ', 'atc_loose');

      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (this.toolinuse-1)];
      
      // loose process
      // rotate backward with more power(+50) as the tight process    
      var cmd = "send " + this.serialPortXTC + " " + "bwd " + (holder.tourque+50) + " " + holder.time + "\n";  
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // ... set the NEGATVE level, if the current go down ... i.e. under 3000mA ... the the collet are loose
      setTimeout(function() { 
         var cmdwait = "send " + this.serialPortXTC + " " + "lev " + atcparams.revlevel + "\n"; 
         chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
      }, (holder.time/2)); // <-- half of holder.time

      // unset tool in use
      this.toolinuse = 0;

      setTimeout(this.setAction.bind(this, 'loosed'), 250); // wait for stop and set status
      this.atc_sec_height();                                // wait for loosed state and go to safety height
   },

   atc_tight: function(data){
      // wait on main cnccontroller's stop state (think asynchron!)
      if(this.action != "moved"){ // wait for moved state
         // console.log('ATC Wait for moved', 'atc_tight');
         setTimeout(this.atc_tight.bind(this, data), 250);
         return;
      }

      // ok state == moved, now we can tighten nut and move the machine 
      console.log('ATC called: ', 'atc_tight');

      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (this.toolnumber -1)];
      
      // tighten process
      var cmd = "send " 
                  + this.serialPortXTC + " " 
                  + "fwd " + holder.tourque + " " + holder.time + "\n"
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // set tool in use
      this.toolinuse = this.toolnumber;

      setTimeout(this.setAction.bind(this, 'tighten'), 250); // wait for stop and set status
      this.atc_sec_height();                                 // wait for loosed state and go to safety height
   },

   unpauseGcode: function() {
      if(this.action != "tighten"){ // wait for stop state
         // console.log('ATC Wait for stop', 'unpauseGcode');
         setTimeout(this.unpauseGcode.bind(this), 1000);
         return;
      }
      console.log('ATC called: ', 'unpauseGcode');
      macro.status("Just unpaused gcode.");
      chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", "");
      
      this.setAction('idle');
   },
   distance2time:function(distance){
      return (distance / this.feedRate) * (60*1000); // distane in milliseconds
   },
};
// call init from cp macro loader
// myXTCMacro.init();