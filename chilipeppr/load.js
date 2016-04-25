// get external js macro one times and run it
var e = window["myXTCMacro"];
if(! e){
  $.getScript( "//rawgit.com/xpix/XTC/master/chilipeppr/macro.js", function( data, textStatus, jqxhr ) {
    console.log( "Load was performed.", data );
  });
}

// here you can set your Parameters
e.serialPortXTC = '/dev/ttyUSB2';

e.atcParameters = {
    level:   900,     // the current level in mA where the spindle will break
    revlevel:-3000,   // the reverse level in mA where the spindle will break
    forward: 30,      // value for minimum rpm
    safetyHeight: 35, // safety height
    feedRate: 300,    // Feedrate to move over the catch cable
    nutZ: -7,         // safety deep position of collet in nut
};

// Where your tool holders?
e.atcMillHolder = [
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

e.init(); // start macro
