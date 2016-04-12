G21
( put a endmill to XTC2)

; move to xtc beta
G0 X50 Y-50 Z20

(the spindle will stop at a minimum current = 200mA)
(chilipeppr_pause XTC lev 200)
(forward rotate spindle very slow)
(chilipeppr_pause XTC fwd 30)

(go down to a specific position, zero pos from spindle holder in nut)
G1 Z-5 F100

; Now spindle are in the nut, detight the collet
; the spindle will drive backward with full power, 
; if the current sinks under 0.4A then collet loose and stop the spindle

(the spindle will stop at a maximum current >= 4A)
(chilipeppr_pause XTC lev 4000)
(backward rotate spindle very fast)
(chilipeppr_pause XTC bwd 400)
(the spindle will stop at a minimum current <= 0.4A)
(chilipeppr_pause XTC lev -400)

; now we drive some rotation to make the collect loose
(the spindle will stop at a maximum current >= 1A)
(chilipeppr_pause XTC lev 1000)
(backward rotate spindle very slow)
(chilipeppr_pause XTC bwd 30)

(and wait to stop after 250 milliseconds)
(chilipeppr_pause XTC tim 250)

(go up clearance hight)
G0 Z25

 