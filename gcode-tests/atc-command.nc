G54
G21 (mm mode)
G90 (abs mode)
(T1: Drill 0.6)
(T2: Drill 1.0)
(T3: Mill  2.0)
(T4: Sink  0.1)
M3 (spindle on)
(get first tool from holder)
G0 X100 Y50
(chilipeppr_pause XTC T1)
G0 X-30 Y50
(chilipeppr_pause XTC T2)
M5 (spindle stop)
M30 (prog stop)
 