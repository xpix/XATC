/* global macro chilipeppr $ */
// get external js macro one times and run it

/* -----------Automatic Toolchanger Macro ----------------------------------- */

var mxtc = window["myXTCMacro"];
if(! mxtc){
  $.getScript( "//rawgit.com/xpix/XTC/master/chilipeppr/macro.js", 
    function( data, textStatus, jqxhr ) {
      console.log( "Load XATC macro was performed.", data );
      setXTCParams(mxtc);
    });
}
else {
  setXTCParams(mxtc);
}

function setXTCParams(macro){
  // here you can set your Parameters
  macro.serialPortXTC = '/dev/ttyUSB2';
  
  macro.atcParameters = {
      level:   900,     // the current level in mA where the spindle will break
      revlevel:-3000,   // the reverse level in mA where the spindle will break
      forward: 30,      // value for minimum rpm
      safetyHeight: 35, // safety height
      feedRate: 300,    // Feedrate to move over the catch cable
      nutZ: -7,         // safety deep position of collet in nut
  };
  
  // Where your tool holders?
  macro.atcMillHolder = [
      /* 
       Center Position holder, 
       |                       |catch height, 
       |                       |            |tourque power 0-400, 
       |                       |            |             | timeout in ms
       |                       |            |             |                               */
      {posX : -250, posY : 15, posZ: 5,     tourque: 300, time: 500}, // 1. endmill holder
      {posX : -250, posY : 45, posZ: 5,     tourque: 300, time: 500}, // 2. endmill holder
      {posX : -250, posY : 75, posZ: 5,     tourque: 300, time: 500}, // 3. endmill holder
  ];
  
  macro.init(); // start macro
}

/* ------------Spindle DC Controller Macro ---------------------------------- */

var mspc = window["SpindleControlMacro"];
if(! mspc){
  $.getScript( "//rawgit.com/xpix/XTC/master/chilipeppr/spindle.js", 
    function( data, textStatus, jqxhr ) {
      console.log( "Load Spindle controller was performed.", data );
      setXTCParams(mspc);
    });
}
else {
  setSPCParams(mspc);
}

function setSPCParams(macro){
  // here you can set your Parameters
  macro.serialPortXTC = '/dev/ttyUSB2';

  macro.init(); // start macro
}


