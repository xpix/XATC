G21
( get a endmill from xtc1)
G0 X100 Y-50 Z20

(chilipeppr_pause xtc bwd 50)
G1 Z0 F100

(Now spindle close to the nut, forward the collet)
(chilipeppr_pause xtc lev 200)
(chilipeppr_pause xtc fwd 50)
G1 Z-5 F100

(Now spindle are in the nut, tight the collet)
(chilipeppr_pause xtc lev 4000)
(chilipeppr_pause xtc fwd 400)
(chilipeppr_pause xtc tim 500)
G0 Z25












