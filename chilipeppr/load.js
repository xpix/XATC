// get external js macro and run it
$.getScript( "//rawgit.com/xpix/XTC/master/chilipeppr/macro.js", function( data, textStatus, jqxhr ) {
  var e = window["myXTCMacro"];
  e.serialPortXTC = '/dev/ttyUSB1';
  e.atcParameters = {
      level:   600,     // the current level in mA where the spindle will break
      revlevel:-3000,   // the reverse level in mA where the spindle will break
      forward: 30,      // value for minimum rpm
      safetyHeight: 35, // safety height
      feedRate: 300,    // Feedrate to move over the catch cable
      nutZ: -7,         // safety deep position of collet in nut
  };
  e.atcMillHolder = [
      // Center Position holder, catch height, tighten value, how long tighten in milliseconds
      // ---------|-------------|-------------|--------------------------------
      {posX : -250, posY : 15,   posZ: 5,   tourque: 300, time: 500}, // first endmill holder
      {posX : -250, posY : 45,   posZ: 5,   tourque: 300, time: 500}, // second endmill holder
  ];
  e.init();
  console.log( "Load was performed.", e );
});