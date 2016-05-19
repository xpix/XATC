/* global macro chilipeppr THREE $ */
/* 

============ MACRO XTC (Automatic Tool Changer) ================================

This macro is used for an Automatic Toolchanger. This woll control the used gcode 
and try to find the Toolchnages, use the Toolnumber to identify the correct Toolholder.
This Macro remember on the used tool and find the correct strategie to let the 
actual used tool in the holder and get a new one.

This will parse the comment to get gcode from commandline i.e.:
   M6 T2
after this command, the machine are in pause mode and we can change
the tool. Here the flow:

   * check if a tool used (T1)
   * put the used tool to holder
      * move to holder with toolnumber == 1
      * set spindle speed and level
      * move down in the nut
      * loose the nut with full power and negative current sense 
         (i.e: -4000, if the current fall under 4Ampere then stop)
      * got to safety height   
   * get the next toolnumber(T2)
      * move to holder with toolnumber == 2
      * set spindle speed and level
      * move down in the nut
      * tight the nut with full power and for a specific time 
         (i.e: fwd 300 500, set 75% power and tight the collet for 0.5 sec)
      * got to safety height
   * call unpause the M6 Stop
   
  
And then it sends commands to a Arduino+DC Spindle Controller
to pre-poition, tight or loose the ER11 Collet.

To test this with tinyg2 or tinyg follow this steps:
   * use SPJS 1.89
   * use url http://chilipeppr.com/tinyg?v9=true
   * set linenumbers on
   * in tinyg widget set "No init CMD's Mode"
   * choose "tinygg2" in SPJS Widget

*/
if (!Array.prototype.last)
    Array.prototype.last = function(){
        return this[this.length - 1];
    };

var myXTCMacro = {
   serialPortXTC:    "/dev/ttyUSB2",   // XTC Controler
   addressServo:     "127.0.0.1",      // Networkaddress of Servoc ESP8266 Controller
   atcParameters: {
         level:   800,     // the current level in mA where the spindle will break
         revlevel:-3000,   // the reverse level in mA where the spindle will break
         forward: 30,      // value for minimum rpm
         safetyHeight: 35, // safety height
         feedRate: 300,    // Feedrate to move over the catch cable
         nutZ: -7,         // safety deep position of collet in nut
   },
   carousel:{
      enabled: true,
      center:{ x:-200, y:15, z: -5, r:45 },  // center of carousel and radius of the diameter center circle
      servo: { block:120, unblock:1}, // position values are in degress
      torqueDegrees: 90,              // maximum arc degrees to torque collet
   },
   atcMillHolder: [
      // Center Position holder, catch height, tighten val, tighten ms,    deg
      // ---------------|-------------|-------------|-------------|---------|------
      {posX :   45.00,  posY :  0,     posZ: 5,   tourque: 300, time: 500, deg: 0},     // first endmill holder
      {posX :   31.82,  posY : -31.82, posZ: 5,   tourque: 300, time: 500, deg: 45},    // second endmill holder
      {posX :       0,  posY : -45.00, posZ: 5,   tourque: 300, time: 500, deg: 90},    // third endmill holder
      {posX :  -31.82,  posY : -31.82, posZ: 5,   tourque: 300, time: 500, deg: 135},   // forth endmill holder
      {posX :  -45.00,  posY :  0,     posZ: 5,   tourque: 300, time: 500, deg: 180},   // 5. endmill holder
      {posX :  -31.82,  posY :  31.82, posZ: 5,   tourque: 300, time: 500, deg: 225},   // 6. endmill holder
      {posX :       0,  posY :  45.00, posZ: 5,   tourque: 300, time: 500, deg: 270},   // 7. endmill holder
      {posX :   31.82,  posY :  31.82, posZ: 5,   tourque: 300, time: 500, deg: 315},   // 7. endmill holder
      // etc.pp
   ],
   feedRate: 100,
   toolnumber: 0,
   toolinuse: 0,
   axis: {x:0, y:0, z:0},
   events: [],
   init: function() {
      // Uninit previous runs to unsubscribe correctly, i.e.
      // so we don't subscribe 100's of times each time we modify
      // and run this macro
      if (window["myXTCMacro"]) {
         macro.status("This macro was run before. Cleaning up...");
         window["myXTCMacro"].uninit();
      }

      // store macro in window object so we have it next time thru
      window["myXTCMacro"] = this;

      // Check for Automatic Toolchange Command
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete ", this, this.onChiliPepprPauseOnComplete );

      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace cnccontroller for ATC");

      // first thing we need to do is get 3d obj
      this.get3dObj(function() {
          // when we get here, we've got the 3d obj 
          console.log('ATC 3dobj loading');
         // TODO: drawHolders again after gcode load
          this.drawHolders();
      });
      
      this.servo(this.carousel.servo.unblock);
   },
   uninit: function() {
      macro.status("Uninitting chilipeppr_pause macro.");
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete ", this, this.onChiliPepprPauseOnComplete );
      this.sceneRemove();
   },
   onStateChanged: function(state){
      console.log('ATC State:', state, this);
      this.State = state;
   },
   onChiliPepprPauseOnComplete : function(data) {
      console.log("ATC onChiliPepprPauseOnComplete . data:", data);
      if(data.gcode.match(/XTC\s+T(\d+)/)){
          var toolnumber = parseInt(RegExp.$1, 10);
        this.onATC({toolnumber: toolnumber});
      }
   },
   updateAxesFromStatus: function (axes) {
      if ('x' in axes && axes.x !== null) {
          this.axis.x = this.rd( axes.x );
      }
      if ('y' in axes && axes.y !== null) {
          this.axis.y = this.rd( axes.y );
      }
      if ('z' in axes && axes.z !== null) {
          this.axis.z = this.rd( axes.z );
      }

      console.log("ATC updateAxesFromStatus. data:", this.axes);

      var that = this;

      // check all events and compare the axis states with event states
      // if has the event xyz the same (rounded to X.1) values as the actual position
      // then fire up the planned event
      this.events.forEach(function(entry){
         if(entry.event.state() != 'resolved' 
            && this.rd(entry.x) == that.axis.x 
            && this.rd(entry.x) == that.axis.y 
            && this.rd(entry.x) == that.axis.z
            )
            {
               entry.event.resolve();                                // Fire up the event
               console.log('ATC fire Event: ', entry.comment);
            }
      });
   },
   // Round values
   rd:function(wert) { 
      return (Math.round( wert * 10 )/10 );
   },

   get3dObj: function (callback) {
      this.userCallbackForGet3dObj = callback;
      chilipeppr.subscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this, this.get3dObjCallback);
      chilipeppr.publish("/com-chilipeppr-widget-3dviewer/request3dObject", "");
      chilipeppr.unsubscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this.get3dObjCallback);
   },
   get3dObjCallback: function (data, meta) {
      console.log("ATC got 3d obj:", data, meta);
      this.obj3d = data;
      this.obj3dmeta = meta;
      if (this.userCallbackForGet3dObj) {
          this.userCallbackForGet3dObj();
          this.userCallbackForGet3dObj = null;
      }
   },
   mySceneGroup: null,
   sceneAdd: function (obj) {
      // let's add our Eagle BRD content outside the scope of the Gcode content
      // so that we have it stay while the Gcode 3D Viewer still functions
      if (this.mySceneGroup == null) {
          this.mySceneGroup = new THREE.Group();
          this.obj3d.add(this.mySceneGroup);
      }
      this.mySceneGroup.add(obj);
      // you need to wake up the 3d viewer to see your changes
      // it sleeps automatically after 5 seconds to convserve CPU
      this.obj3dmeta.widget.wakeAnimate();
   },
   sceneRemove: function () {
      if (this.mySceneGroup != null){
         this.obj3d.remove(this.mySceneGroup);
         this.obj3dmeta.widget.wakeAnimate();
      }
   },

   drawHolders: function(blength, bwidth) {

      var material = new THREE.MeshBasicMaterial({
         color: 0xAAAADD,
         wireframe: true,
         opacity: 0.5
      });
   
      var that = this;
      this.atcMillHolder.forEach(function(holder){
         var geometry = new THREE.CylinderGeometry(8.5,8.5,50,6);
         var mesh = new THREE.Mesh( geometry, material );
         mesh.position.set( 
             (that.carousel.center.x + holder.posX),
             (that.carousel.center.y + holder.posY),
             (-50 + holder.posZ)
         );
         mesh.rotateX(Math.PI / 2); // 90 degrees

         that.sceneAdd( mesh );   
      });
   },


   onATC: function(data){
      console.log('ATC Execute Line:', data);

      // now the machine is in pause mode
      // cuz M6 linenumber are the same as actual linenumber
      // and we can do whatever we like :)
      console.log('ATC Process:', this);

      // first stop spindle
      this.stopSpindle();

      this.servo(this.carousel.servo.unblock);

      this.toolnumber = data.toolnumber;
      this.events = [];

      // check if the same tool in use
      if(this.toolinuse > 0 && this.toolnumber == this.toolinuse){
         console.log('ATC same tool number: ignored', this);
         return;
      } 
      // check if a different tool in use
      else if(this.toolinuse > 0 && this.toolinuse != this.toolnumber){
         this.atc_move_to_holder(this.toolinuse, 'unscrew'); // move to holder and unscrew
      } 
      else if(this.toolnumber > 0){
         // get new tool from holder, if neccessary
         this.atc_move_to_holder(this.toolnumber, 'screw'); // move to holder and screw
      }
   },

   atc_move_to_holder: function( toolnumber, art ){

      console.log('ATC called: ', 'atc_move_to_holder', toolnumber, art);

      // get parameters for millholder
      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (toolnumber-1) ]; 

      if($.type(holder) !== 'object')
         return;

      // -------------------- EVENT Planning -----------------------------------

      // Prepare event StartSpindleSlow ----------------------------------------
      var startSpindleSlow = $.Deferred();
      var startSpindleSlowZPos = atcparams.safetyHeight;

      // add a rule if startSpindleSlow event happend
      $.when( startSpindleSlow )
         .done( this.startSpindle.bind(this, atcparams.forward, atcparams.level) );

      // register the event for updateAxesFromStatus, 
      // the cool thing this event will only one time fired :)
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startSpindleSlow,
         comment: 'Start spindle slow for pre-position.',
      });


      // Prepare event looseCollet ---------------------------------------------
      var looseCollet = $.Deferred();
      var looseColletZPos = atcparams.nutZ+1;

      if(art == 'unscrew'){
         // add a rule if looseCollet event happend after startSpindleSlow
         $.when( looseCollet )
            .done( this.atc_unscrew.bind(this) );
   
         // register the event for updateAxesFromStatus, 
         // the cool thing this event will only one time fired :)
         this.events.push({ x:holder.posX,  y:holder.posY,  z:looseColletZPos,
            event: looseCollet,
            comment: 'Rotate spindle backwards with full power for 0.5 seconds.',
         });
      }

      // Prepare event tightCollet ---------------------------------------------
      var tightCollet = $.Deferred();
      var tightColletZPos = atcparams.nutZ;
      
      if(art == 'screw'){
         // add a rule if tightCollet event happend
         $.when( tightCollet )
            .done( this.atc_screw.bind(this) );
   
         // register the event for updateAxesFromStatus, 
         // the cool thing this event will only one time fired :)
         this.events.push({ x:holder.posX,  y:holder.posY,  z:tightColletZPos,
            event: tightCollet,
            comment: 'Rotate spindle forward with full power for 0.5 seconds.',
         });
      }

      // Prepare event unpause ---------------------------------------------
      var unpause = $.Deferred();
      var unpausedZPos = atcparams.safetyHeight+0.1;
      
      // add a rule if unpause event happend 
      // after startSpindleSlow and tightCollet 
      $.when( startSpindleSlow, unpause )
         .done( this.unpauseGcode.bind(this, art) );

      // register the event for updateAxesFromStatus, 
      // the cool thing this event will only one time fired :)
      this.events.push({ x:holder.posX,  y:holder.posY,  z:unpausedZPos,
         event: unpause,
         comment: 'Unpause the process and do the job.',
      });

      // -------------------- EVENT Planning -- END ----------------------------

      console.log('ATC events', this.events);

      var nutZ = (art === 'unscrew' ? looseColletZPos : tightColletZPos);

      // now move spindle to the holder position
      // first to safetyHeight ...
      // change to G59 coordinaten system
      var cmd = "G59\n";

      // move Z to safety height
      cmd += "G0 Z" + atcparams.safetyHeight + "\n";

      // move to XY holder center ...
      cmd += "G0 X" + holder.posX + " Y" + holder.posY + "\n"; 
      cmd += "G4 P0.5\n"; // wait for start spindle slow

      // move to holder Z pre-position height ...
      cmd += "G0 Z" + holder.posZ + "\n";

      // move slowly to the minus end collet Z position  ...
      cmd += "G1 Z" + nutZ + " F" + atcparams.feedRate + "\n";
      cmd += "G4 P2\n"; // wait some second's for screw/unscrew event

      // Add gcode and events for the XATC carousel
      if(art == 'screw'){
         cmd += this.torqueMove(nutZ, holder, atcparams);
      } 
      else {
         cmd += this.looseMove(nutZ, holder, atcparams);
      }

      // move to event unpause
      cmd += "G0 Z" + unpausedZPos + "\n";   
      cmd += "G4 P1\n"; // wait some second's for unpaused event

      // change to original machine Coordinaten system
      cmd += "G54\n";   
      
      chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);
   },

   looseMove: function(nutZ, holder, atcparams){
      if(! this.carousel.enabled) 
         return '';

      var cmd = '';

      // Move to Z-zero + x
      var startSpindleSlowZPos = 0.3;
      cmd += "G1 Z" + startSpindleSlowZPos + "\n";
      cmd += "G4 P1\n"; // wait some second's for start rotate spindle

      var startSpindleSlow = $.Deferred();
      $.when( startSpindleSlow )
         .done( this.startSpindle.bind(this, atcparams.forward, atcparams.level) );
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startSpindleSlow,
         comment: 'Start spindle slow for blocking.',
      });
      
      // block spindle via servo
      var startBlocker = $.Deferred();
      $.when( startSpindleSlow, startBlocker )
         .done( this.servo.bind(this, this.carousel.servo.block) );
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startBlocker,
         comment: 'Move servo to block spindle shaft.',
      });
      
      var torqueSpindleZPos = (nutZ+0.2);
      
      // move to nutZ+x cuz no tighten in this moment
      cmd += "G1 Z" + torqueSpindleZPos + "\n"; 
      
      // move an torqueDegrees(°) arc CW
      var theta1   = holder.deg + this.carousel.torqueDegrees;
      var theta2   = holder.deg;
      cmd += this.arc('G2', theta1, theta2);
      cmd += "G4 P2\n";
      
      // deblock spindle at end of arc move
      var deBlocker = $.Deferred();
      $.when( deBlocker )
         .done( this.servo.bind(this, this.carousel.servo.unblock) );
      this.events.push({ x: this.darc.XEnd,  y: this.darc.YEnd,  z:torqueSpindleZPos,
         event: deBlocker,
         comment: 'Move servo to deblock spindle shaft.',
      });

      // move an ~90° arc CCW, back to original position
      theta1   = holder.deg;
      theta2   = holder.deg + this.carousel.torqueDegrees;
      cmd += this.arc('G3', theta1, theta2);

      return cmd;
   },


   torqueMove: function(nutZ, holder, atcparams){
      if(! this.carousel.enabled) 
         return '';

      var cmd = '';

      // Move to Z-zero + x
      var startSpindleSlowZPos = 0.3;
      cmd += "G1 Z" + startSpindleSlowZPos + "\n";
      cmd += "G4 P1\n"; // wait some second's for start rotate spindle

      var startSpindleSlow = $.Deferred();
      $.when( startSpindleSlow )
         .done( this.startSpindle.bind(this, atcparams.forward, atcparams.level) );
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startSpindleSlow,
         comment: 'Start spindle slow for blocking.',
      });
      
      // block spindle via servo
      var startBlocker = $.Deferred();
      $.when( startSpindleSlow, startBlocker )
         .done( this.servo.bind(this, this.carousel.servo.block) );
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startBlocker,
         comment: 'Move servo to block spindle shaft.',
      });
      
      var torqueSpindleZPos = (nutZ+0.2);
      
      // move to nutZ+x cuz no tighten in this moment
      cmd += "G1 Z" + torqueSpindleZPos + "\n"; 
      
      // move an torqueDegrees(°) arc CW
      var theta1   = holder.deg;
      var theta2   = holder.deg + this.carousel.torqueDegrees;
      cmd += this.arc('G3', theta1, theta2);
      cmd += "G4 P2\n";
      
      // deblock spindle at end of arc move
      var deBlocker = $.Deferred();
      $.when( deBlocker )
         .done( this.servo.bind(this, this.carousel.servo.unblock) );
      this.events.push({ x: this.darc.XEnd,  y: this.darc.YEnd,  z:torqueSpindleZPos,
         event: deBlocker,
         comment: 'Move servo to deblock spindle shaft.',
      });

      // move an ~90° arc CCW, back to original position
      theta1   = holder.deg + this.carousel.torqueDegrees;
      theta2   = holder.deg;
      cmd += this.arc('G2', theta1, theta2);

      return cmd;
   },
   
   arc:function(mode, theta1, theta2){
      if(theta2 > 360) theta2 =- 360; 

      this.darc = {};

      theta1 = theta1*(Math.PI/180); // calculate in radians
      theta2 = theta2*(Math.PI/180); // calculate in radians

      var carousel = this.carousel.center;
      // calculate the arc move, from center of carousel
      // http://www.instructables.com/id/How-to-program-arcs-and-linear-movement-in-G-Code-/?ALLSTEPS
      var xe   = parseFloat((carousel.r*Math.cos(theta2)).toFixed(2));              // Xc+(R*cos(Theta2))
      var ye   = parseFloat((carousel.r*Math.sin(theta2)).toFixed(2));              // Yc+(R*sin(Theta2))
      var xs   = parseFloat(((carousel.r*Math.cos(theta1))).toFixed(2)); // (Xc-(R*cos(Theta1)))-Xc   
      var ys   = parseFloat(((carousel.r*Math.sin(theta1))).toFixed(2)); // (Yc-(R*sin(Theta1)))-Yc   

      this.darc = {XEnd: xe, YEnd: ye, XStart: xs, YStart: ys};

      return "G17 " + mode + " X" + xe + " Y" + ye + " R" + carousel.r + "\n";
   },

   
   servo: function(pos){
      $.get( 'http://' +this.addressServo +'/servo', { value: pos } )
         .done(function( data ) {
            console.log('ATC Servo get called', data);
         });
   },
   
   startSpindle: function(speed, level){
      var cmd = '';
      cmd = "send " + this.serialPortXTC + " " 
                  + "fwd 400\n" 
                  + "fwd " + speed + "\n"; 
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
      console.log('ATC spindle', cmd);

      cmd = "send " + this.serialPortXTC + " " 
                  + "lev " + level + "\n"; 
      if(level > 0)
         chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
   },

   stopSpindle: function(){
      var cmd = "send " + this.serialPortXTC + " " + "brk\n"; 
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
      console.log('ATC spindle', cmd);
   },


   // Event to move to savetyHeight in Z Axis
   atc_sec_height: function(){
      console.log('ATC called: ', 'atc_sec_height');

      var cmd = "G0 Z" + this.atcParameters.safetyHeight + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);
   },

   // Event to move to unscrew the collet
   atc_unscrew: function(){
      // ok action == moved, now we can loose nut and move the machine 
      console.log('ATC called: ', 'atc_unscrew');
      var holder = this.atcMillHolder[ (this.toolinuse-1)];
      
      // unscrew process
      // rotate backward with more power(+50) as the tight process    
      var cmd = "send " + this.serialPortXTC + " " 
         + "unscrew 400  " + this.atcParameters.revlevel + " " + holder.time + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // unset tool in use
      this.toolinuse = 0;
   },

   atc_screw: function(data){
      // ok state == moved, now we can tighten nut and move the machine 
      console.log('ATC called: ', 'atc_screw');
      var holder = this.atcMillHolder[ (this.toolnumber -1)];
      
      // tighten process (TODO: use level)
      var cmd = "send " + this.serialPortXTC + " " 
                  + "screw " + holder.tourque + " " + holder.time + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // set tool in use
      this.toolinuse = this.toolnumber;
   },

   unpauseGcode: function(art) {
      this.servo(this.carousel.servo.unblock);
      console.log('ATC called: ', 'unpauseGcode', art);

      if(art === 'unscrew' && this.toolnumber > 0){
         // Ok, put the last tool in holder now we get the next one
         this.onATC({toolnumber: this.toolnumber});
         return;
      }
      chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", null);


      // this.startSpindle(400, 0); // Restart spindle
   },
};
// call init from cp 
// myXTCMacro.init();