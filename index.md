XATC
====

For my XDisPlace project i try to find a good solution to bring all (Mill, Cut, Drill, Solder dispense, Solder) processes together. 
I wrote a ToDo what i need to bring this project to fly. I realized, all what i need it's just to find a solution for an Automatic Tool Changer (ATC).
Here i try to describe all steps how you can build your own XATC.

[![Full endmill change](https://img.youtube.com/vi/-IGAYd8OnOE/0.jpg)](https://www.youtube.com/watch?v=-IGAYd8OnOE)

![Some Prototypes](https://lh3.googleusercontent.com/1o3ptjsWJQUGR22RlypUTsi2ktSJ3byGEMolx_pXxnDRvq5ogUWD7ulUHWkvxa8qtrL7SXkMepEVHm6FAdkG-Nc4atV2e4KjoQi_63OzVnHIrBEG3auFcek6qWjRMISj2B0mC8zGKARV_CO9TWj1cgftHU3S-RYYG8eXTFCoWAibuJXKpvtrGFgDI2wiABH6ZeNlKR8gdXP0iiSJJ2S1WEN9H-P24lO7uYtcODubpMjg4pTMn2kHSBgDORnhClFat18EpGuPN1CmYPjnEeFyJQeLXF4_71D36fJEcHkoV5Z98DN8-c-bcRmzEkuGIGhiW4Nvf2BXdAl_UAednUdQInyDS0-16FGcRo1hLOaDgdUw7gpae3Cg1XGA0iqsBDpJtCpBgRKbKwYqqZ_jlbN47F2dG9JSNoJgZfVEsx1UCNtnjooV4_8wdeGnC4Z1rlDlslAlmLjEOtJfmdVt_zyX549jAqNXSt_QtGJkP_v0FSyuQ6jdl_UEBQrzuwA-pxuAi9mPJz3kfzGWTvOlsHPAw-yLx_QL6fWodn9PS0PfEKzL_435sELOwHA2TrFZ3quWN--lLO_B2Kz64QnVmxm2E-ipPH1WjLUVL6LIuR8JFwedQJMgCgxCqxsEzI5EaUlIukZlrItAyH0dtdRgKnbtep-__dQ1wsxoS9_MljLXnHE=w400-no)


Project Links
------------
* Weekly messages on [g+](https://plus.google.com/collection/QX47gB)
* Video sessions on [youtube](https://www.youtube.com/playlist?list=PLYPTUTcLMTK7m0cOoOKlDnuhGV8ONrgo_)
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
  

