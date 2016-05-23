/* global macro chilipeppr $ */
// get external js macro one times and run it


/* ------------Spindle DC Controller Macro ---------------------------------- */
var mspc = window["SpindleControlMacro"];
if(! mspc){
  $.getScript( "http://rawgit.com/xpix/XTC/master/chilipeppr/spindle.js", 
    function( data, textStatus, jqxhr ) {
      console.log( "Load Spindle controller was performed.", data );
      mspc = window["SpindleControlMacro"];
      setSPCParams(mspc);
      mspc.init(); // start macro
    });
}
else {
  setSPCParams(mspc);
}

function setSPCParams(macro){
  // here you can set your Parameters
  macro.serialPortXTC = '/dev/ttyUSB1';
}

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
}

function setXTCParams(macro){
  // here you can set your Parameters
   macro.serialPortXTC =   "/dev/ttyUSB1";   // XTC Controler
   macro.addressServo =    "192.168.1.135";      // Networkaddress of Servoc ESP8266 Controller
   macro.atcParameters = {
         level:   800,     // the current level in mA where the spindle will break
         revlevel:-3000,   // the reverse level in mA where the spindle will break
         forward: 30,      // value for minimum rpm
         safetyHeight: 27, // safety height
         feedRate: 300,    // Feedrate to move over the catch cable
         nutZ: -7,         // safety deep position of collet in nut
   };
   macro.carousel = {
      enabled: true,
      center:{ x:-206.8, y:73.7, z: -5, r:45 },  // center of carousel and radius of the diameter center circle
      servo: { block:55, unblock:5}, // position values are in degress
      torqueDegrees: 45,              // maximum arc degrees to torque collet
   };
   macro.atcMillHolder = [
      // Center Position holder, catch height, tighten val, tighten ms,    deg
      // ---------------|-------------|-------------|-------------|---------|------
      {posX :   45.00,  posY :  0,     posZ: 5,   tourque: 300, time: 500, deg: 360},     // first endmill holder
      {posX :   31.82,  posY : -31.82, posZ: 5,   tourque: 300, time: 500, deg: 315},    // second endmill holder
      {posX :       0,  posY : -45.00, posZ: 5,   tourque: 300, time: 500, deg: 270},    // third endmill holder
      {posX :  -31.82,  posY : -31.82, posZ: 5,   tourque: 300, time: 500, deg: 225},   // forth endmill holder
      {posX :  -45.00,  posY :  0,     posZ: 5,   tourque: 300, time: 500, deg: 180},   // 5. endmill holder
      {posX :  -31.82,  posY :  31.82, posZ: 5,   tourque: 300, time: 500, deg: 135},   // 6. endmill holder
      {posX :       0,  posY :  45.00, posZ: 5,   tourque: 300, time: 500, deg: 90},   // 7. endmill holder
      {posX :   31.82,  posY :  31.82, posZ: 5,   tourque: 300, time: 500, deg: 45},   // 8. endmill holder
      // etc.pp
   ];
}