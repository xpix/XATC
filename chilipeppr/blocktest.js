/* global settings chilipeppr $ */
/* 
    test blocking, call this as macro and try different parameters
    goal is to block perfect the spindle shaft every X seconds 
*/

// Start interval
setTimeout(loop, 5000);

function setXTCParams(){
  // here you can set your Parameters
   var macro = {
        serialPortXTC:      "/dev/ttyUSB1",  // Spindle DC Controller
        addressServo:       "192.168.1.135", // ESP8266 Webserver address
        target:             590,             // potentiometer value at posBlock
        posBlock:           125,             // block angle in degrees
        posOpen:            90,              // open angle in degrees
        sp_backward:        50,              // speed of dc spindle
        sp_level:           2500,            // level in mA to break spindle
   };
    
    return macro;
}

function loop (){
    var settings = setXTCParams();
    
    // Move to open position
    $.get( 'http://' +settings.addressServo +'/servo', { position: settings.posOpen, target: 1 } )
       .done(function( data ) {
          console.log('ATC Servo called to open.', data);
       });



    // Test block
    setTimeout(function(){
        // rotate spindle backwards with 12% of max rpm
        var cmd = "send " + settings.serialPortXTC + " bwd " + settings.sp_backward + "\nlev "+ settings.sp_level + "\n";
        chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
        
        setTimeout(function() {
            // set target value and move servo to block position
            $.get( 'http://' +settings.addressServo +'/servo', { position: settings.posBlock, target: settings.target } )
               .done(function( data ) {
                    console.log('ATC Servo called to block.', data);
                    setTimeout(loop, 5000);
               })
               .fail(function( data ) {
                    console.log('ATC Servo FAILED to block.', data);
                    setTimeout(loop, 5000);
               });
        });
      }, 2500);
}
