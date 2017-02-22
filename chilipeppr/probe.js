/* global macro chilipeppr THREE $ */
/*
(chilipeppr_pause PROBE)
*/
var myWatchProbe = {
   thick: 0.035, // thick of copperfoil in mm
   axis: { mz: 0 },
   state: null,

	init: function() {
		if (window["myWatchProbe"]) {
			window["myWatchProbe"].uninit();
		}
		window["myWatchProbe"] = this;
		
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
	  chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
	},
	uninit: function() {
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.updateAxesFromStatus);
	  chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
	},
	onChiliPepprPauseOnExecute: function(data) {
		console.log("got onChiliPepprPauseOnExecute. data:", data);

      if(data.gcode.match(/PROBE/)){
         var g = "(Touch probe movement)\n";
         g += "G38.2 Z-50 F100\n";
         chilipeppr.publish("/com-chilipeppr-widget-serialport/send", g);

         this.intvl = setInterval(this.unpauseGcode.bind(this), 200);
      }
	},
   updateAxesFromStatus: function (axis) {
      // machine ccordinate for Z-Axis for touch probe
      if (axis.mpo !== undefined && 'z' in axis.mpo && axis.mpo.z !== null) {
          this.axis.mz = axis.mpo.z;
      }
   },
   onStateChanged: function(state){
      console.log('PRB State:', state, this);
      this.state = state;
   },
	unpauseGcode: function() {
      // check for state == stop and unpause/clearInterval
      console.log('PRB unpauseGcode:', this.state, this);
      if(this.state == 'Stop'){
         chilipeppr.publish("/com-chilipeppr-widget-serialport/send", 
            "G10 L2 P1 Z" + (this.axis.mz - this.thick) + "\n" + 
            "M9\n"
         );        // set G54/Z-axis to Zero
         clearInterval(this.intvl);
         chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", null);
      }
	}
}
myWatchProbe.init();