Solution for an automatic toolchange XTC
===============================================

# Description

For my XDisPlace project i try to find a solution to bring all processes together. I wrote a ToDo what i need to bring this project to fly. I realized, all what i need it's only to find a solution for an Automatic Tool Changer (ATC).

![XATC Workplace](https://lh3.googleusercontent.com/-gZRU1NQGzte2d22oHx_v0L-WDC8f3ATi_WtJtFi8xYX97e4Ln01ePsn9YTv_E5VYU4_YJmlX5PIV30Rh61GjR8x1P31lLqbU7sNb7bkI8lf7UkxpL2MD-bwJr5RYuokMxhLYRHJNg6EkTB3XpkDLVbtKoGFSfS2X5SP_f6gdrlNQm3PZDdqkPSCo3YURoVRl4bmppKKdjS8LmquFUl-TU-rhbXhl6IewRucRjuogMsoRULKo-5PhvmFyRf_inAbNUNKYiyLT1v_9lu6f9TpDVlfkHaQcjjITV3VtWUK7-pk58CCBbG7UKLcjvNvcfX2hm3PZ1UEt2T6GoYii-Dbsdx0EEdcQFEgg3A1tFw01KqloFBZA0h9VnWW-OreknPdmbN1m-CIpLiM_6CWzn9dQciQwQs0HqdCk_36QIMZoJAJNH-D7ujzw5_rzd6IZ3WgCvXyNEq-zKzWWvYMpObUzSPdEZENFWfjswKkM_iGIlhND32CgOxnB2Txl7PYPgRg7DdKkd8vusTA67ZhNX3_kzv-Q8xjt5_vm_0zG9xRbvobKGzgl_LeuXvKkDGM5kpmDxnqidgA_hStKZnIoyJ9rM68Z1McJg22=w1084-h813-no)

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

Now i want to present the holder for the tool socket. Here you see all my try's, i designed this holder with Fusion360 a very cool program. Maybe i will make a videosession about this great piece of Software. To produce this holder, i use the website 3dhubs.com. It's easy to upload your design as STL File and choose a friend not so far from you and he print this for some bucks. I have to say a big thank you to Jan, he produce my prototype as he fast he can and in a very good quality.

To build a platform for this holders are easy, get a piece of MDF and mark the holes for some screws on the right position. Drill some holes for M5 Screws and screw this platform on the alumium profile.

Now we can first glue our Holders to this new platform. I use my favorite double glue tape and put a small piece on the downside off every holder. We need a very accurate position for every holder, put a broken endmill in your spindle collet. Home your machine and move the machine to every position you like, i note all the position in my notebook.

As the CNC3040 was delivered, i found an endmill with a cut diameter of 3.175. This we can use to make the holder endmill hole more accurate. Use a drill press and drill this hole, after drill we can compare the outsidediameter with a broken endmill shaft.

I called this little white plastic pre-position thing "Stopper", you see that's only a milled piece of POM or Delrin. This material is easy to mill and can handle temperature up to 200 degrees. You have to measure very accurate the outsidediameter of you collet nut and use a this as insidediameter + 0.1mm. After that we can press, maybe with a vice, this stopper to our collet nut.

Now begun the hard work, to find the perfect parameters for the xtc was dreadful. My Setup was intresting, i use a macro to process all steps and this watch the position of the machine. At specific position in xyz an event will happend. I.e. rotate the spindle or screw the collet and so on. The chrome debugger helps me a lot and i love it. You can add some breakpoints and change the parameter at runtime. The first time i do only dry tests, thats more easy for me to watch the spindle and so on.

On this dry test's i realized i have to screw the holders on this MDF Platform. Ok, drill some holes and do it. The Problem, after that i need again the accurate position. Use an screwd endmill and move the machine to the first holder ... that's it.

Last but no least, a trick to hold the collet vertical inside of the hollow spindle shat. i use a simple springload and screw this together with collet nut.

Here is it, my best moment since a month of hard work. The first successful Toolchnage .. friends i'm so happy ... enjoy this moment :)



 

=======

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
