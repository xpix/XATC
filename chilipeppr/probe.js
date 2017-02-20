/*
(chilipeppr_pause probe)
*/
var myWatchProbe = {
	init: function() {
		if (window["myWatchProbe"]) {
			window["myWatchProbe"].uninit();
		}
		window["myWatchProbe"] = this;
		
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
		chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
	},
	uninit: function() {
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
		chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
	},
	onChiliPepprPauseOnExecute: function(data) {
		console.log("got onChiliPepprPauseOnExecute. data:", data);

      var g = "(Touch probe movement)\n";
      g += "G38.2 Z-50 F100\n";
      this.send(g);

		this.intvl = setInterval(this.unpauseGcode, 200);
	},
   onStateChanged: function(state){
      console.log('PRB State:', state, this);
      this.State = state;
   },
	unpauseGcode: function() {
      // check for state == stop and unpause/clearInterval
      if(this.State == 'Stop'){
         clearInterval(this.intvl);
         chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", "");
      }
	}
}
myWatchProbe.init();