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
      * describe an arc in CW direction with +carousel.tourqueDegrees
      * loose the nut with full power for 200 
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
   serialPortXTC:    "/dev/ttyUSB2",   // Spindle DC Controler
   addressServo:     "127.0.0.1",      // Networkaddress of Servoc ESP8266 Controller
   atcParameters: {
         slow:          60,   // value for minimum rpm
         safetyHeight:  27,   // safety height
         feedRate:      300,  // Feedrate to move to scew position
         nutZ:          -5,   // safety deep position of collet in nut
         loose:{               
            speed: 200,       // after unscrew the collet,  params to rotate the spindle shaft with X speed ... 
            time:   50,       // ... for X time (in milliseconds) to loose the collet complete
         },
   },
   carousel:{
      enabled: true,
      center:{ x:-200, y:15, r:45 },  // center of carousel and radius of the diameter center circle
      servo: { 
         // please test with ./blocktest.js to find perfect parameters
         block:   125,   // arc in degress to block the spindle shaft 
         unblock: 60,    // arc in degress to deblock the spindle shaft 
         target:  478,   /* target value readed at pin A0 on ESP to 
                            get the actual correct block position
                            it's just an option */
         level:   2500,  // level in mA to break spindle at ~2.5 Ampere
      }, // position values are in degress
      torqueDegrees: 45, /* IMPORTANT: maximum arc degrees to torque collet 
                            This value set the maximum torque on  ER-collet-nut, too high 
                            values can result in loose steps of motors or destroy your machine
                         */
   },
   atcMillHolder: [
      // Center Position holder, catch height, tighten val, tighten ms,    deg
      // ---------------|-------------|-------------|-------------|---------|------
      {posX :   45.00,  posY :  0,     posZ: 5,   tourque: 400, time: 500, deg: 360},  // first endmill holder
      {posX :   31.82,  posY : -31.82, posZ: 5,   tourque: 400, time: 500, deg: 315},  // second endmill holder
      {posX :       0,  posY : -45.00, posZ: 5,   tourque: 400, time: 500, deg: 270},  // third endmill holder
      {posX :  -31.82,  posY : -31.82, posZ: 5,   tourque: 400, time: 500, deg: 225},  // forth endmill holder
      {posX :  -45.00,  posY :  0,     posZ: 5,   tourque: 400, time: 500, deg: 180},  // 5. endmill holder
      {posX :  -31.82,  posY :  31.82, posZ: 5,   tourque: 400, time: 500, deg: 135},  // 6. endmill holder
      {posX :       0,  posY :  45.00, posZ: 5,   tourque: 400, time: 500, deg: 90},   // 7. endmill holder
      {posX :   31.82,  posY :  31.82, posZ: 5,   tourque: 400, time: 500, deg: 45},   // 8. endmill holder
      // etc.pp
   ],
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

      // remove macro buttons
      $('#com-chilipeppr-widget-macro .panel-heading .mymacrobtns').remove();

      // Check for Automatic Toolchange Command
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete ", this, this.onChiliPepprPauseOnComplete );
      chilipeppr.subscribe("/com-chilipeppr-widget-eagle/beforeToolPathRender", this, this.onBeforeRender);

      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace cnccontroller for ATC");

      // first thing we need to do is get 3d obj
      this.get3dObj(function() {
          // when we get here, we've got the 3d obj 
          console.log('ATC 3dobj loading');
          this.drawHolders();
          
          console.log('ATC get tool database');
          this.toolsDatabase();
          
          this.addBtn();
      });
      
      this.servo(this.carousel.servo.unblock);
   },
   uninit: function() {
      macro.status("Uninitting chilipeppr_pause macro.");
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete ", this, this.onChiliPepprPauseOnComplete );
      chilipeppr.unsubscribe("/com-chilipeppr-widget-eagle/beforeToolPathRender", this, this.onBeforeRender);

      this.sceneRemove();
   },
   onBeforeRender: function(data){
      console.log('ATC onBeforeRender:', data);
      // drawHolders again after gcode load
      setTimeout(function(){
         this.drawHolders();
         this.toolsDatabase();
         this.displayTools(0, 0);
      }, 1000);
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
   updateAxesFromStatus: function (axis) {
      if ('x' in axis && axis.x !== null) {
          this.axis.x = this.rd( axis.x );
      }
      if ('y' in axis && axis.y !== null) {
          this.axis.y = this.rd( axis.y );
      }
      if ('z' in axis && axis.z !== null) {
          this.axis.z = this.rd( axis.z );
      }

      var that = this;

      // check all events and compare the axis states with event states
      // if has the event xyz the same (rounded to X.1) values as the actual position
      // then fire up the planned event
      this.events.forEach(function(entry){
         console.log("ATC updateAxesFromStatus. data:", that.axis);
         if(entry.event.state() != 'resolved' 
            && that.rd(entry.x) == that.axis.x 
            && that.rd(entry.y) == that.axis.y 
            && that.rd(entry.z) == that.axis.z
            )
            {
               entry.event.resolve();                                // Fire up the event
               console.log('ATC fire Event: ', entry);
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

	addBtn: function() {
		var btnGrp = $('<div class="btn-group pull-right mymacrobtns" style="margin-right:6px;"></div>');
		var btn1 = $('<button type="button" class="btn btn-xs btn-default mymacro-btn1">1</button>');
      var that = this;
		btn1.click(function(){
		   that.displayTools(that.toolnumber, that.toolinuse);
		});
		btnGrp.append(btn1);
		$('#com-chilipeppr-widget-macro .panel-heading').append(btnGrp);
	},

   toolsDatabase: function(){
   	var gcodelines = this.obj3d.userData.lines;
   	// Loop thru lines to see if comment mark for tdb happend
      this.toolsdatabase = []; 
   	for (var i = 0; i < 100; i++) {
   		var line = gcodelines[i];
        console.log('ATC line', line);
         if(line !== undefined && line.args.text.match(/T(\d+)\:\s*(\S*)\s+(\S+)/)){
          this.toolsdatabase.push({
             number:    parseInt(RegExp.$1, 10),
             type:      RegExp.$2,
             size:      parseFloat(RegExp.$3)
          });
         }
      }
      console.log('ATC toolsdatabase', this.toolsdatabase);
      return this.toolsdatabase;
   },      

   displayTools: function(take, bring){
      if(! this.toolsdatabase.length)
         return;
      
      var table = '<table class="table table-bordered"><thead class="thead-default"><tr><th>Holder</th><th>Type</th><th>Size</th><th>Job</th></tr></thead><tbody>';
      this.toolsdatabase.forEach(function(tool){
         var icon = (tool.number == take ? 'glyphicon-arrow-right' : (tool.number == bring ? 'glyphicon-arrow-right' : ''));
         table += '<tr bgcolor="' 
            + (tool.number == take ? '#DDFFDD' : (tool.number == bring ? '#FFFFDD' : '') ) 
            + '"><td>T'+ tool.number + '</td><td>'+ tool.type + '</td><td align="right" char=".">'
            + tool.size.toFixed(1) + ' mm</td>'
            + '<td><span class="glyphicon ' + icon + '" aria-hidden="true"></td>'
            + '</tr>';   
      });
      table += '</tr></tbody></table>';

      if(table !== undefined)
         chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "<b>XATC Tools Database</b>", table, 5000);
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

      this.servo(this.carousel.servo.unblock);

      this.spindleStatus(); // remember on last spindle rpm

      this.toolnumber = data.toolnumber;
      this.events = [];


      // check if the same tool in use
      if(this.toolinuse > 0 && this.toolnumber == this.toolinuse){
         console.log('ATC same tool number: ignored', this);
         this.unpauseGcode();
         return;
      } 
      // check if a different tool in use
      else if(this.toolinuse > 0 && this.toolinuse != this.toolnumber){
         this.displayTools(this.toolnumber, this.toolinuse);
         this.atc_move_to_holder(this.toolinuse, 'unscrew'); // move to holder and unscrew
      } 
      else if(this.toolnumber > 0){
         // get new tool from holder, if neccessary
         this.displayTools(this.toolnumber);
         this.atc_move_to_holder(this.toolnumber, 'screw'); // move to holder and screw
      }
   },

   atc_move_to_holder: function( toolnumber, art ){

      console.log('ATC called: ', 'atc_move_to_holder', toolnumber, art);

      // first stop spindle
      //this.stopSpindle();

      // then prepare spindle
      this.startSpindle(100);


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
         .done( this.startSpindle.bind(this, atcparams.slow) );

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
      // change to G59 coordinaten system & XY plave for ARC's
      var cmd = "G59 G17\n";

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
      cmd += this.torqueMove(nutZ, holder, atcparams, art);

      // move to event unpause
      cmd += "G0 Z" + unpausedZPos + "\n";   
      cmd += "G4 P1\n"; // wait some second's for unpaused event

      // change to original machine Coordinaten system
      cmd += "G54\n";   
      
      this.send(cmd);
   },

   torqueMove: function(nutZ, holder, atcparams, art){
      var screw = (art == 'screw' ? true : false);
      if(! this.carousel.enabled) 
         return '';

      var cmd = '';
      var that = this;

      // Move to Z-zero + x
      var startSpindleSlowZPos = 0.2;
      cmd += "G1 Z" + startSpindleSlowZPos + "\n";
      cmd += "G4 P2\n"; // wait some second's for start rotate spindle

      var startSpindleSlow = $.Deferred();
      $.when( startSpindleSlow )
         .done( function(){
            this.startSpindle(this.atcParameters.slow, this.carousel.servo.level, (screw ? 'bwd' : 'fwd')); 
         });
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startSpindleSlow,
         comment: 'Start spindle slow for blocking.',
      });
      
      var blockSpindlePos = 0.3;
      cmd += "G1 F10 Z" + blockSpindlePos + "\n";
      cmd += "F500\n"; // set Feedrate for screw process
      cmd += "G4 P2\n"; // wait some second's for start rotate spindle

      // block spindle via servo 
      // we "shake" spindle for a short time to have a perfect "catched" wrench
      var startBlocker = $.Deferred();
      $.when( startSpindleSlow, startBlocker )
         .done( function(){
            that.servo( that.carousel.servo.block );
            setTimeout(function(){
               // maybe we call 200ms later a slow spindle spin 
               // in the opposite direction, for perfect fit of wrench?
               this.startSpindle(this.atcParameters.slow, 500, (screw ? 'fwd' : 'bwd')); 
               // then back the original direction to press the spindle in wrench for magic move :)
               setTimeout(function(){
                  this.startSpindle(this.atcParameters.slow, 0, (screw ? 'bwd' : 'fwd')); 
               }, 300);
            }, 200);
         });
      this.events.push({ x:holder.posX,  y:holder.posY,  z:blockSpindlePos,
         event: startBlocker,
         comment: 'Move servo to block spindle shaft.',
      });
      
      var torqueSpindleZPos = (nutZ+0.2);
      
      // move to nutZ+x cuz no tighten in this moment
      cmd += "G1 Z" + torqueSpindleZPos + "\n"; 
      
      // move an torqueDegrees(°) arc CW
      var theta1   = holder.deg;
      var theta2   = holder.deg + this.carousel.torqueDegrees;
      if(! screw)
          theta2   = holder.deg - this.carousel.torqueDegrees;
      cmd += this.arc((screw ? 'G3' : 'G2'), theta1, theta2, holder);
      cmd += "G4 P2\n";
      
      // deblock spindle at end of arc move
      var deBlocker = $.Deferred();
      $.when( deBlocker )
         .done( function(){
            that.servo(that.carousel.servo.unblock);      
            that.stopSpindle();
         });
      this.events.push({ x: this.darc.XEnd,  y: this.darc.YEnd,  z:torqueSpindleZPos,
         event: deBlocker,
         comment: 'Move servo to deblock spindle shaft.',
      });

      // move an ~90° arc CCW, back to original position
      theta1   = holder.deg + this.carousel.torqueDegrees;
      if(! screw)
          theta1   = holder.deg - this.carousel.torqueDegrees;
      theta2   = holder.deg;
      cmd += this.arc((screw ? 'G2' : 'G3'), theta1, theta2, holder);

      // unscrew with a short powerfull backward rotate 
      // to let the endmill in holder
      if(! screw){
            var powerbwdPos = (nutZ-0.3);
            cmd += "G1 Z" + powerbwdPos + "\n"; 
            cmd += "G4 P2\n";

            var PowerBWD = $.Deferred();
            $.when( PowerBWD )
               .done( this.startSpindle.bind(this, this.atcParameters.loose.speed +" "+ this.atcParameters.loose.time, 0, 'bwd') );
            this.events.push({ x:holder.posX,  y:holder.posY,  z:powerbwdPos,
               event: PowerBWD,
               comment: 'Powerfull backward to let endmill in spindle.',
            });
      }

      return cmd;
   },
   
   arc:function(mode, th1, th2, holder){
      this.darc = {};

      var theta1 = th1*(Math.PI/180); // calculate in radians
      var theta2 = th2*(Math.PI/180); // calculate in radians
      var carousel = this.carousel.center;

      var xc = 0, yc = 0;

      // calculate the arc move, from center of carousel
      // http://www.instructables.com/id/How-to-program-arcs-and-linear-movement-in-G-Code-/?ALLSTEPS
      var xe   = (xc+(carousel.r*Math.cos(theta2))).toFixed(2);   // Xc+(R*cos(Theta2))
      var ye   = (yc+(carousel.r*Math.sin(theta2))).toFixed(2);   // Yc+(R*sin(Theta2))

      this.darc = {XEnd: xe, YEnd: ye};

      return mode + " X" + xe + " Y" + ye + " R" + carousel.r + "\n";
   },

   servo: function(pos, callback){
      $.get( 'http://' +this.addressServo +'/servo', { position: pos, target: this.carousel.servo.target } )
         .done(function( data ) {
              console.log('ATC Servo called to block.', data);
              if($.type(callback) == 'function')
                  callback();
         })
         .fail(function( data ) {
              console.log('ATC Servo FAILED to block.', data);
         });


   },

   
   send: function(command, port){
      if(port !== undefined){
         // port send (second controller)
         var cmd = "send " + port + " " + command + "\n"; 
         chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
      } else {
         // direct send
         chilipeppr.publish("/com-chilipeppr-widget-serialport/send", command);
      }
      console.log('ATC SEND: ', command, port);
   },

   spindleStatus: function(type){
      // save the last spindle status
      if(type === undefined)
         this.send('sav', this.serialPortXTC);
      // save the last spindle status
      else if(type === 'rem')
         this.send('rem', this.serialPortXTC);
   },
   
   startSpindle: function(speed, level, direction, time){
      if(direction === undefined)
            direction = 'fwd';
      if(time === undefined)
            time = '0';

      var cmd = direction + " " + speed; 
      if(time > 0)
            cmd += " " + time;
      this.send(cmd, this.serialPortXTC);

      console.log('ATC spindle', cmd);
      var that = this;
      if(level > 0)
         setTimeout(function(){
            var cmd = "lev " + level;
            that.send(cmd, this.serialPortXTC);
         }, 500);
   },

   stopSpindle: function(){
      this.send("brk", this.serialPortXTC);
      console.log('ATC brk spindle');
   },


   // Event to move to savetyHeight in Z Axis
   atc_sec_height: function(){
      console.log('ATC called: ', 'atc_sec_height');
      var cmd = "G0 Z" + this.atcParameters.safetyHeight;
      this.send(cmd);
   },

   // Event to move to unscrew the collet
   atc_unscrew: function(){
      // ok action == moved, now we can loose nut and move the machine 
      console.log('ATC called: ', 'atc_unscrew');

      // unset tool in use
      this.toolinuse = 0;
   },

   atc_screw: function(data){
      // ok state == moved, now we can tighten nut and move the machine 
      console.log('ATC called: ', 'atc_screw');
      var holder = this.atcMillHolder[ (this.toolnumber -1)];
      
      // tighten process (TODO: use level)
      this.send("fwd "+ holder.tourque+" "+ holder.time, this.serialPortXTC);

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

      this.spindleStatus('rem'); // set last saved spindle speed
   },
};
// call init from cp 
// myXTCMacro.init();