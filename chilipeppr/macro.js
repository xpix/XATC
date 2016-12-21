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
   * set linenumbers on
   * choose "tinyg" in SPJS Widget
   * add follow as start commands to XTC-Console in cjhilipeppr
      srv 80
      pwm

*/
if (!Array.prototype.last)
    Array.prototype.last = function(){
        return this[this.length - 1];
    };

var myXTCMacro = {
   serialPortXTC:    "/dev/ttyUSB2",   // Spindle DC Controler
   atcParameters: {
         slow:          30,   // value for minimum rpm
         safetyHeight:  40,   // safety height
         feedRate:      300,  // Feedrate to move to screw position
         nutZ:          -5,   // safety deep position of collet in nut
         loose:{               
            speed: 200,       // after unscrew the collet,  params to rotate the spindle shaft with X speed ... 
            time:   50,       // ... for X time (in milliseconds) to loose the collet complete
         },
         jitter:{
            z:       -4,      // Position to start jitter
            speed:  200,      // Power to jitter (means rotate X ms in every direction)
            time:   15,      // time to jitter on every direction
         },
   },
   carousel:{
      enabled: true,
      center:{ r:45 },  // radius of the diameter center holes circle
      servo: { 
         // please test with ./blocktest.js to find perfect parameters
         block:   125,   // arc in degress to block the spindle shaft 
         unblock: 60,    // arc in degress to deblock the spindle shaft 
         touch:   100,   // arc in degress to touch the spindle shaft for touch probe
         level:   2500,  // level in mA to break spindle at ~2.5 Ampere
      }, // position values are in degress
      catchDegrees:  15, // in screw mode: degrees for opposite direction to catch the collet
                         // 0 means no opposite move
      torqueDegrees: 50, /* IMPORTANT: maximum arc degrees to torque collet 
                            This value set the maximum torque on  ER-collet-nut, too high 
                            values can result in loose steps of motors or destroy your machine
                         */
   },
   touchprobe:{
      position: {x:5, y:-5},
      enabled: true,
      servo: 130,       // Angel to connect Spindle shaft for sure!
      feedrate: 150,    // Feedrate for touch probe
      thick: 0.035,     // thick of probe (copper tape or other)
      secure_height: 2, // move to this z-height after probing
   },
   atcMillHolder: [
      // Data for XATC 0.2 without(!) Gator Grips 
      // Center Position holder, catch height, tighten val, tighten ms,    deg
      // ---------------|-------------|-------------|-------------|---------|------
      {posX :   53.50,  posY :  0,     posZ: 5,   tourque: 400, time: 500, deg: 360},  // 1. endmill holder
      {posX :       0,  posY : -53.50, posZ: 5,   tourque: 400, time: 500, deg: 270},  // 2, endmill holder
      {posX :  -53.50,  posY :  0,     posZ: 5,   tourque: 400, time: 500, deg: 180},  // 3. endmill holder
      {posX :       0,  posY :  53.50, posZ: 5,   tourque: 400, time: 500, deg: 90},   // 4. endmill holder


      /* Data for XATC 0.1 with Gator Grips
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
      */
   ],
   toolnumber: 0,
   toolinuse: 0,
   axis: {x:0, y:0, z:0},
   probed: false,
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
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnComplete );
      chilipeppr.subscribe("/com-chilipeppr-widget-eagle/beforeToolPathRender", this, this.onBeforeRender);

      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace cnccontroller for ATC");

      // first thing we need to do is get 3d obj
      this.get3dObj(function() {
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
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this, this.onChiliPepprPauseOnComplete );
      chilipeppr.unsubscribe("/com-chilipeppr-widget-eagle/beforeToolPathRender", this, this.onBeforeRender);

      this.sceneRemove();
   },
   onBeforeRender: function(data){
      console.log('ATC onBeforeRender:', data);
      // drawHolders again after gcode load
      setTimeout(function(){
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
      // machine ccordinate for Z-Axis for touch probe
      if (axis.mpo !== undefined && 'z' in axis.mpo && axis.mpo.z !== null) {
          this.axis.mz =axis.mpo.z;
      }

      var that = this;

      // check all events and compare the axis states with event states
      // if has the event xyz the same (rounded to X.1) values as the actual position
      // then fire up the planned event
      this.events.forEach(function(entry){
         //console.log("ATC updateAxesFromStatus. data:", that.axis);
         if(entry.event.state() != 'resolved' 
            && that.rd(entry.x) == that.axis.x 
            && that.rd(entry.y) == that.axis.y 
            && that.rd(entry.z) == that.axis.z
            )
            {
               entry.event.resolve();                                // Fire up the event
               console.log('ATC fire Event: ', entry);
            }

         if(entry.event.state() != 'resolved' 
            && entry.art        =='twoaxis'
            && that.rd(entry.x) == that.axis.x 
            && that.rd(entry.y) == that.axis.y 
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
		var btn1 = $('<button type="button" class="btn btn-xs btn-default mymacro-btn1"><span class="glyphicon glyphicon-th-list"></span></button>');
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
         // xpix style
         // (T1: Drill 0.6)
         if(line !== undefined && line.args.text.match(/T(\d+)\:\s*(\S*)\s+(\S+)/)){
          this.toolsdatabase.push({
             number:    parseInt(RegExp.$1, 10),
             type:      RegExp.$2,
             size:      parseFloat(RegExp.$3)
          });
         }

         // tinyg postprocessor style
         //  (T1  D=3.175 CR=1.587 - ZMIN=-12. - KUGELSCHLICHTFRSER)
         if(line !== undefined && line.args.text.match(/T(\d+)\s+D\=(\S*)\s+CR\=(\S+)\s*\-\s*ZMIN=\S+\s*\-\s*(\S+)\)/)){
          this.toolsdatabase.push({
             number:    parseInt(RegExp.$1, 10),
             type:      RegExp.$4,
             size:      parseFloat(RegExp.$2)
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

   onATC: function(data){
      console.log('ATC Execute Line:', data);

      // now the machine is in pause mode
      // cuz M6 linenumber are the same as actual linenumber
      // and we can do whatever we like :)
      console.log('ATC Process:', this);

      this.servo(this.carousel.servo.unblock);

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

      // then prepare spindle for slow rotate
      this.startSpindle(100);


      // get parameters for millholder
      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (toolnumber-1) ]; 

      if($.type(holder) !== 'object')
         return;

      // G-CODE Start --------
      // now move spindle to the holder position
      // first to safetyHeight ...
      // change to G59 coordinaten system & XY plave for ARC's
      var cmd = "G59 G17\n";

      // -------------------- EVENT Planning -----------------------------------

      // Prepare event StartSpindleSlow ----------------------------------------
      var startSpindleSlow = $.Deferred();
      var startSpindleSlowZPos = atcparams.safetyHeight;

      // add a rule if startSpindleSlow event happend
      $.when( startSpindleSlow )
         .done( this.startSpindle.bind(this, atcparams.slow, 1000) );

      // register the event for updateAxesFromStatus, 
      // the cool thing this event will only one time fired :)
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startSpindleSlow,
         comment: 'Start spindle slow for pre-position.',
      });

      // move to XY holder center ...
      cmd += "G0 Z" + startSpindleSlowZPos + "\n";
      cmd += "G0 X" + holder.posX + " Y" + holder.posY + "\n"; 
      cmd += "G4 P0.5\n"; // wait for start spindle slow


      // Prepare event jitterSpindle -------------------------------------------
      var jitterSpindle= $.Deferred();
      var jitterSpindleZPos = this.atcParameters.jitter.z;

      $.when( jitterSpindle )
         .done( this.jitterSpindle.bind(this) );

      // register the event for updateAxesFromStatus, 
      this.events.push({ x:holder.posX,  y:holder.posY,  z:jitterSpindleZPos,
         event: jitterSpindle,
         comment: 'Jitter spindle to catch collet nut.',
      });

      // move to holder Z pre-position height ...
      cmd += "G0 Z" + holder.posZ + "\n";
      // add jitter 
      cmd += "G1 Z" + jitterSpindleZPos + "\n";
      cmd += "G4 P1\n"; // wait some second's for jitter event


      // Add screw or unscrew process with -------------------------------------
      // catchframe and magic move
      if(art == 'screw'){
         cmd += this.screw(holder, atcparams);
      } else {
         cmd += this.unscrew(holder, atcparams);
      }

      // Prepare event unpause -------------------------------------------------
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

      // move to event unpause
      cmd += "G0 Z" + unpausedZPos + "\n";   
      cmd += "G4 P1\n"; // wait some second's for unpaused event


      // -------------------- EVENT Planning -- END ----------------------------

      // change to original machine Coordinaten system
      cmd += "G54\n";   
      
      this.send(cmd);
   },

   // ---------------------------------------------
   screw: function(holder, atcparams){
      var cmd = '';
      var art = 'screw';

      // Prepare event tightCollet ---------------------------------------------
      var tightCollet = $.Deferred();
      var tightColletZPos = atcparams.nutZ;
      
      // add a rule if tightCollet event happend
      $.when( tightCollet )
         .done( this.atc_screw.bind(this) );

      // register the event for updateAxesFromStatus, 
      // the cool thing this event will only one time fired :)
      this.events.push({ x:holder.posX,  y:holder.posY,  z:tightColletZPos,
         event: tightCollet,
         comment: 'Rotate spindle forward with full power for 0.5 seconds.',
      });

      cmd += "G1 Z" + tightColletZPos + " F" + atcparams.feedRate + "\n";
      cmd += "G4 P2\n"; // wait some second's for screw/unscrew event

      // Magic move 
      cmd += this.torqueMove(tightColletZPos, holder, atcparams, art);

      return cmd;
   },

   // ---------------------------------------------
   unscrew: function(holder, atcparams){
      var cmd = '';
      var art = 'unscrew';

      var looseColletZPos = atcparams.nutZ-0.3; // -4.3

      // Magic move (block spindle and arc move)
      cmd += this.torqueMove(looseColletZPos, holder, atcparams, art);

      // Prepare event looseCollet ---------------------------------------------
      var looseCollet = $.Deferred();
      // add a rule if looseCollet event happend after startSpindleSlow
      $.when( looseCollet )
         .done( this.atc_unscrew.bind(this) );

      // register the event for updateAxesFromStatus, 
      // the cool thing this event will only one time fired :)
      this.events.push({ x:holder.posX,  y:holder.posY,  z:looseColletZPos,
         event: looseCollet,
         comment: 'Rotate spindle backwards with full power for 0.5 seconds.',
      });


      cmd += "G1 Z" + looseColletZPos + " F" + atcparams.feedRate + "\n";
      cmd += "G4 P2\n"; // wait some second's for screw/unscrew event

      return cmd;
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
            that.startSpindle(that.atcParameters.slow, that.carousel.servo.level, (screw ? 'bwd' : 'fwd')); 
         });
      this.events.push({ x:holder.posX,  y:holder.posY,  z:startSpindleSlowZPos,
         event: startSpindleSlow,
         comment: 'Start spindle slow for blocking.',
      });

      // ------------------------------

      var blockSpindlePos = 0.3;
      cmd += "G1 F100 Z" + blockSpindlePos + "\n";
      cmd += "F750\n"; // set Feedrate for screw process
      cmd += "G4 P1\n"; // wait some second's for block spindle

      // block spindle via servo 
      // we "shake" spindle for a short time to have a perfect "catched" wrench
      var startBlocker = $.Deferred();
      $.when( startSpindleSlow, startBlocker )
         .done( function(){
            that.servo( that.carousel.servo.block );
            setTimeout(function(){
               that.jitterSpindle();
            }, 200);
         });
      this.events.push({ x:holder.posX,  y:holder.posY,  z:blockSpindlePos,
         event: startBlocker,
         comment: 'Move servo to block spindle shaft.',
      });

      // ------------------------------

      // Move to -2.1 and call jitter to catch the frame AFTER block spindle
      var jitterSpindlePos = this.atcParameters.jitter.z-0.25;
      cmd += "G1 Z" + jitterSpindlePos + "\n";
      cmd += "G4 P1\n"; // wait a second

      var startJitter = $.Deferred();
      $.when( startSpindleSlow, startBlocker, startJitter )
         .done( function(){
            that.jitterSpindle((art == 'screw' ? 'bwd' : 'fwd'));
         });
      this.events.push({ x:holder.posX,  y:holder.posY,  z:jitterSpindlePos,
         event: startJitter,
         comment: 'Jitter after block spindle to catch frame.',
      });

      // ------------------------------

      // move to nutZ+x cuz no tighten in this moment
      var torqueSpindleZPos = (nutZ+0.2);
      cmd += "G1 Z" + torqueSpindleZPos + "\n"; 

      // BACKWARD CATCHING ------------
      // move first to the opposite direction 
      // to catch collet for sure
      if(screw && this.carousel.catchDegrees){
         // backwards ~15°
         var theta1   = holder.deg;
         var theta2   = holder.deg - this.carousel.catchDegrees;
         cmd += this.arc('G2', theta1, theta2, holder);
         // forwards ~15°
         cmd += this.arc('G3', theta2, theta1, holder);
      }
      // -------------------------------
      
      // move an torqueDegrees(°) arc CW
      var theta1   = holder.deg;
      var theta2   = holder.deg + this.carousel.torqueDegrees;
      if(! screw){
          theta2   = holder.deg - (this.carousel.torqueDegrees + (this.carousel.torqueDegrees/2));
      }
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

      // ------------------------------

      // move an ~50° arc CCW, back to original position
      theta1   = holder.deg + this.carousel.torqueDegrees;
      if(! screw)
          theta1   = holder.deg - this.carousel.torqueDegrees;
      theta2   = holder.deg;
      cmd += this.arc((screw ? 'G2' : 'G3'), theta1, theta2, holder);

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

   /* 
   Send servo control commands and call a 
   callback after success move
   */
   servo: function(pos, callback){
      this.send('srv ' + pos, this.serialPortXTC);

      console.log('ATC Servo called to (un)block.');
      if($.type(callback) == 'function')
         callback();
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

   jitterSpindle: function(direction){
      this.send("lev 0", this.serialPortXTC);
      this.send(
         "jit " + this.atcParameters.jitter.speed + ' '  + this.atcParameters.jitter.time, 
         this.serialPortXTC
      );
      if(direction){
         var that = this;
         setTimeout(function(){
            that.startSpindle(that.atcParameters.slow, 0, direction); 
         }, 100);
      }
      console.log('ATC jitter spindle');
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

      // untighten process
      this.send("bwd "+ this.atcParameters.loose.speed+" "+ this.atcParameters.loose.time, this.serialPortXTC);

      // unset tool in use
      this.toolinuse = 0;
   },

   atc_screw: function(data){
      // ok state == moved, now we can tighten nut and move the machine 
      console.log('ATC called: ', 'atc_screw');
      var holder = this.atcMillHolder[ (this.toolnumber -1)];
      
      // tighten process
      this.send("fwd "+ holder.tourque+" "+ holder.time, this.serialPortXTC);

      // set tool in use
      this.toolinuse = this.toolnumber;
   },

   touch_probe_sensor: function() {
      var touchp = this.touchprobe;
      if(touchp.enabled == false)
         return;
      this.servo(this.touchprobe.servo);  // touch the spindle shaft for probing
      var g = "(Touch probe movement)\n";
      g += "G54 G17 G21\n";            // init movement
      /*
         use calculate offset coordinates for touch point
         analyze bbox and use the lower left/right/bottom/top corner
      */
      g += "G0 X"+ this.touchprobe.position.x +" Y" + this.touchprobe.position.y +"\n";     // move to corner of workpiece minus offset
      if(this.probed){
            g += "G0 Z5\n";       // move fast to second touchprobe
      }
      g += "G38.2 Z-50 F" + this.touchprobe.feedrate + "\n";       // touchprobe
      g += "G91 G0 Z2\n" + "G90\n";
      g += "G0 X0 Y0\n";      // move to corner of workpiece
      g += "G4 P1\n";         // pause for event
      this.send(g);

      // Events ----------------------------
      
      // block spindle via servo 
      // we "shake" spindle for a short time to have a perfect "catched" wrench
      var that = this;
      var startDeBlocker = $.Deferred();
      $.when( startDeBlocker )
         .done( function(){
            that.send("G10 L2 P1 Z" + (that.axis.mz - (that.touchprobe.secure_height + that.touchprobe.thick)) + "\n");        // set G54/Z-axis to Zero
            that.servo( that.carousel.servo.unblock );
            that.probed = true;
            that.send("pwm", this.serialPortXTC); // read tinyg pwm spindle speed and set spindle
            chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", null);
         });
      this.events.push({ x:0,  y:0, art:'twoaxis',
         event: startDeBlocker,
         comment: 'Move servo to deblock spindle shaft.',
      });
   },


   unpauseGcode: function(art) {
      this.servo(this.carousel.servo.unblock);
      console.log('ATC called: ', 'unpauseGcode', art);

      if(art === 'unscrew' && this.toolnumber > 0){
         // Ok, put the last tool in holder now we get the next one
         this.onATC({toolnumber: this.toolnumber});
         return;
      }

      // to unpause and remember 
      // on spindle status look at:
      this.touch_probe_sensor();                         // move to zero of surface and make a touch probe
   },
};
// call init from cp 
// myXTCMacro.init();