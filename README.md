XATC
====

For my XDisPlace project i try to find a good solution to bring all (Mill, Cut, Drill, Solder dispense, Solder) processes together. 
I wrote a ToDo what i need to bring this project to fly. I realized, all what i need it's just to find a solution for an Automatic Tool Changer (ATC).
Here i try to describe all steps how you can build your own XATC.


Project Links
------------
* Weekly messages on [g+](https://plus.google.com/collection/QX47gB)
* Video sessions on [youtube](https://www.youtube.com/playlist?list=PLYPTUTcLMTK7m0cOoOKlDnuhGV8ONrgo)
* Web Video log on [blogspot](http://xpixer.blogspot.com/)

Dependencies
------------

* [TinyG as CNC Controller](https://github.com/synthetos/TinyG)
  The first stable version is realized on a tinyGv8.
* [Chilipeppr](http://chilipeppr.com/tinyg)
  This will be needed at runtime to perform the actual tool change.
* [Arduino](https://www.arduino.cc/)
  Only required for Servo control support.
* [CNC3040](http://www.ebay.com/bhp/cnc-3040z)
  The hardware platform that i use for this project

Components
----------
On the follow pages i'll describe the diy mechanical parts that you can mill on your CNC3040.

* [Spindle lock platform](https://github.com/xpix/XATC/wiki/Spindle-lock-platform)
  All about lock the spindle, drafts, software and BOM List's
* [XATC Carousel](https://github.com/xpix/XATC/wiki/XATC-Carousel)
  All about the central component, the xatc carousel ...
  

