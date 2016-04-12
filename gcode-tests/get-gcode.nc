G21
(send /dev/ttyUSB2 fwd 20)
(send /dev/ttyUSB2 lev 400)
G0 X0 Z35
G0 Z5
G1 Z-7 F300
(send /dev/ttyUSB2 fwd 200 500)
G4 P
G0 Z35
G0 X100
