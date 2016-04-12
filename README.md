Solution for an automatic toolchange XTC
===============================================

# spindle get tool
- Spindle move to a specific point
- via hall sensor search for correct rotation position
- move down in a tool nut, center a 3.177 hole with tool
- pulse in cw direction and count the rotations
- pulse with full power and for one second

# spindle release tool
- Spindle move to a specific point
- via hall sensor search for correct rotation position
- move down in a tool nut, center a 3.177 hole with tool
- pulse with full power and for one second in CR direction
- pulse in cr direction and count the rotations

# Nut holder
- get a nut with sw17mm: http://www.amazon.de/dp/B005I4PWUQ
- mill quadrat block for nut
- center a hole with 3.178/15mm
- work table has 7.5mm slots every 30 mm
- bolts are M6

# Software
- wrote a serial command program to stop/start/breake a Motor
- can include as a normal serial device to SPJS

# Implement a tool change to gcode

Use an macro, that only connect to XTC Console and send all commands after XTC[1234].
- parameters are
   params = {
      max_detight_time: 250ms,
      max_tight_time:   500ms,
      loose_time:       250ms,
      slow_rotate:      30rpm,       
      fast_rotate:      400rpm,    

      max_power:        4000mA,
      min_power:        200mA,

      clearance_height: 25mm,   

      XTC1: {
         x: 100, # pos X from XTC Holder alpha
         y: -50, # pos Y from XTC Holder alpha
         z: -5   # end pos Z from collet at XTC Holder alpha
      },
      XTC2: {
         x: 100, # pos X from XTC Holder beta
         y: -50, # pos Y from XTC Holder beta
         z: -5   # end pos Z from collet at XTC Holder beta
      },
      ...
   };

- example to get an endmill:
   ```
   ( get a endmill from XTC1)
   G0 X100 Y-50 Z20                      (move to xtc alpha)
   (chilipeppr_pause XTC lev 200)        (the spindle will stop at a minimum current = 200mA)
   (chilipeppr_pause XTC fwd 30)         (forward rotate spindle very slow)
   G1 Z-5 F100                           (go down to a specific position, zero pos from spindle holder in nut)

   # Now spindle are in the nut, tight the collet
   (chilipeppr_pause XTC lev 4000)       (the spindle will stop at a minimum current >= 4A)
   (chilipeppr_pause XTC fwd 400)        (forward rotate spindle very fast)
   (chilipeppr_pause XTC tim 500)        (stop rotate after 500 milliseconds or current >= 4A)
   G0 Z25                                (go up clearance hight)
   ```

- example to put an endmill:
   ```
   ( put a endmill to XTC2)
   G0 X50 Y-50 Z20                       (move to xtc beta)
   (chilipeppr_pause XTC lev 200)        (the spindle will stop at a minimum current = 200mA)
   (chilipeppr_pause XTC fwd 30)         (forward rotate spindle very slow)
   G1 Z-5 F100                           (go down to a specific position, zero pos from spindle holder in nut)

   # Now spindle are in the nut, detight the collet
   # the spindle will drive backward with full power, 
   # if the current sinks under 0.4A then collet loose and stop the spindle
   (chilipeppr_pause XTC lev 4000)       (the spindle will stop at a maximum current >= 4A)
   (chilipeppr_pause XTC bwd 400)        (backward rotate spindle very fast)
   (chilipeppr_pause XTC lev -400)       (the spindle will stop at a minimum current <= 0.4A)

   # now we drive some rotation to make the collect loose
   (chilipeppr_pause XTC lev 1000)       (the spindle will stop at a maximum current >= 1A)
   (chilipeppr_pause XTC bwd 30)         (backward rotate spindle very slow)
   (chilipeppr_pause XTC tim 250)        (and wait to stop after 250 milliseconds)

   G0 Z25                                 (go up clearance hight)
   ```
   


# Links:
- Change direction of a spindle, but use SSR's: 
   * http://www.exp-tech.de/pololu-g2-high-power-motor-driver-24v13

   * http://lab.whitequark.org/notes/2014-06-15/cnc3020t-coolant-pump-and-ccw-rotation/ 
   * http://playwithrobots.com/dc-motor-driver-circuits/
   * http://www.ebay.de/itm/12-24V-180W-High-power-DC-Motor-Driver-Speed-reversing-current-PID-controller-/222009628227
