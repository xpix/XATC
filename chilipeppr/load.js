/* global macro chilipeppr $ */
// get external js macro one times and run it

/* -----------Automatic Toolchanger Macro ----------------------------------- */
var mxtc = window["myXTCMacro"];
if(! mxtc){
  $.getScript( "http://rawgit.com/xpix/XTC/master/chilipeppr/macro.js", 
    function( data, textStatus, jqxhr ) {
      console.log( "Load XATC macro was performed.", data );
      mxtc = window["myXTCMacro"];
      setXTCParams(mxtc);
      mxtc.init();
    });
}
else {
  setXTCParams(mxtc);
  mxtc.toolinuse = 0;
  console.log('INIT MACRO', mxtc);
}

function setXTCParams(macro){
  // here you can set your Parameters
   macro.serialPortXTC =   "/dev/ttyUSB1";   // XTC Controler
   macro.atcParameters.safetyHeight = 42;
   macro.atcParameters.jitter.z = -4;
   macro.atcParameters.nutZ = -5;
   macro.atcParameters.slow = 60;   // value for minimum rpm

   macro.carousel = {
      enabled: true,
      center:{ x:-206.8, y:73.7, z: -5, r: 53.5},  // center of carousel and radius of the diameter center circle
      servo: { block:175, unblock:125}, // position values are in degress
      torqueDegrees: 50,              // maximum arc degrees to torque collet
   };
   macro.atcMillHolder = [
      // Center Position holder, catch height, tighten val, tighten ms,    deg
      // ---------------|-------------|-------------|-------------|---------|------
      {posX :   53.50,  posY :  0,     posZ: 5,   tourque: 400, time: 100, deg: 360},  // 1. endmill holder
      {posX :       0,  posY : -53.50, posZ: 5,   tourque: 400, time: 100, deg: 270},  // 2, endmill holder
      {posX :  -53.50,  posY :  0,     posZ: 5,   tourque: 400, time: 100, deg: 180},  // 3. endmill holder
      {posX :       0,  posY :  53.50, posZ: 5,   tourque: 400, time: 100, deg: 90},   // 4. endmill holder
   ];

   macro.touchprobe.servo = 160;

}