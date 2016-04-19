Solution for an automatic toolchange XTC
===============================================

# Description

For my XDisPlace project i try to find a solution to bring all processes together. I wrote a ToDo what i need to bring this project to fly. I realized, all what i need it's only to find a solution for an Automatic Tool Changer (ATC).

![XDisPlace](https://lh3.googleusercontent.com/hJQ62omTeoFyo_g-iEoer4g-bX4MI_faNayzBDcgYmb5MXoNdrYOjGyU6H6BM-zRHPP4iZsEpLAsiJ4kWKxMED0UEnBkswWeHk1lf4gjEVPSBChhVWfMXu2Pq7LBoScjsVigO1ncac6EFLbz6TS4JzGaeNvrE1yW20GngXDywDwUCTZXwYJFTd0mXhfR_RpTnoG-cKBxrhTFX2z0-Ny5FyIM0X_tfB4QXmAlxlGAgMMMbEYeHX8ujfmG2eYKIdZDDY6tMc36ubm3tBbufcwIMUKkv1WwpP5XCBVXEyZtxczhxO9NNgBX2IujIDK0AHd3TqaQuNCldbPOPtPPUTGJygbpUeO3B7C-4YJCpgdpUBmeCD37skRINmUSGnzdPqgGmJpDPecfxDTJaR_tsoe-1am0EqKdWqXFlYVn3eTGXmlH38l5OZY7F4NcezP1ec6pjRkrezuvGCC4Z6pmuR5vxixiXfqwaz_pnXxGjmKMtCDqJqXPx03EgAw_pb-jzKF_TENrgFxnhomxIh0y2F-C750PXT_Is1ZiJhXsxQher2OX5T_XcfFlHJB54Kr2jD4deg5qNQ=w1319-h989-no)

I'm proud to present my XTC (eXtremly simple automatic Tool Changer). The most ATC's for spindles cost around up to 2500 and more bucks. For me it's to expensive and i play a small braingame "If it possible to make this process more simple and cheaper?" and the Answer is "yes!". I use only some standard elements with a special DC Motor Driver.

<iframe width="640" height="480" src="https://www.youtube.com/embed/49Iyu2OID74" frameborder="0" allowfullscreen></iframe>

This DC Motor driver comes from Polulu and his some nice Features. We can measure the actual current and rotate the DC motor forward or backward. A simple but nice feature, we can control the speed in both direction and can break the spindle immediatly. Here you see my first prototype, the dc driver are connected to an arduino and i wrote a small program to control all features from driver via a serial console.

Foto from Arduino+DC Driver with connected Spindle.

The commands are easy, you can send "help" and you get all possible commands, the first one are forward and backward. This commands understand the speed parameter from zero to 400, as second parameter you can give the time in milliseconds. Ok, in example. You want to drive the spindle forward with full power but only for 1 second. Please input "fwd 400" for forward full power and as second "1000" miliseconds. Here the result ... Another very nice command are brk, that's a ACTIVE Break. Ok, we drive our spindle with full power and after that we break this with "brk". Cool or?

Screenshot cp serial console

Now comes the realy cool thing, with "lev" we can set the level of current. You start the spindle and try to stop with ur Hand, the current will go up, if the current higher as the level the spindle will stop immediatly. With other words, will something the spindle stress then he break in this moment. Why we need this, well .. wait a minute :)

"tim" stays for time and let the motor stop after some milliseconds, i.e. bwd 200\ntim 500\n let the spindle rotate backwards and break after 500ms.

"dbg" are for debugging, you can start and stop a logging for all parameters. Yue will see every 250 milliseconds the actual data from DC Controller.
 
Now i wrote a some lines in my XDisPlace Macro to control | Chilipeppr, second camera to CNC machine
 
 

# Links:
- Change direction of a spindle, but use SSR's: 
   * http://www.exp-tech.de/pololu-g2-high-power-motor-driver-24v13

   * http://lab.whitequark.org/notes/2014-06-15/cnc3020t-coolant-pump-and-ccw-rotation/ 
   * http://playwithrobots.com/dc-motor-driver-circuits/
   * http://www.ebay.de/itm/12-24V-180W-High-power-DC-Motor-Driver-Speed-reversing-current-PID-controller-/222009628227
