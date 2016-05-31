/* global settings chilipeppr $ */
/* 
    test blocking, call this as macro and try different parameters
    goal is to block perfect the spindle shaft every X seconds 
*/

function setXTCParams(){
  // here you can set your Parameters
   var macro = {
        serialPortXTC:      "/dev/ttyUSB1",  // Spindle DC Controller
        addressServo:       "192.168.1.135", // ESP8266 Webserver address
        target:             500,             // potentiometer value at posBlock
        posBlock:           125,             // block angle in degrees
        posOpen:            35,              // open angle in degrees
        sp_backward:        50,              // speed of dc spindle
        sp_level:           2500,            // level in mA to break spindle
   };
    
    return macro;
}

// Stop old interval
clearInterval(window['blocktest']);

// Start interval
window['blocktest'] = setInterval(function(){
      var settings = setXTCParams();

      // Move to open position
      setTimeout(function(){
        $.get( 'http://' +this.addressServo +'/servo', { value: settings.posOpen } )
           .done(function( data ) {
              console.log('ATC Servo get called', data);
           });
      }, 500);


      // Test block
      setTimeout(function(){
          var cmd = "send " + settings.serialPortXTC + "bwd " + settings.sp_backward + "\nlev "+ settings.sp_level + "\n";
          chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

          $.get( 'http://' +settings.addressServo +'/target', { value: settings.target } )
             .done(function( data ) {
                $.get( 'http://' +this.addressServo +'/servo', { value: settings.posBlock } )
                   .done(function( data ) {
                      console.log('ATC Servo get called', data);
                   });
             });
      }, 2500);

}, 5000);
