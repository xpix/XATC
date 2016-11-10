#ifndef DualVNH5019MotorShield_h
#define DualVNH5019MotorShield_h

#include <Arduino.h>

class DualVNH5019MotorShield
{
  public:  
    // CONSTRUCTORS
    DualVNH5019MotorShield(); // Default pin selection.
    DualVNH5019MotorShield(unsigned char INA1, unsigned char INB1, unsigned char EN1DIAG1, unsigned char CS1); // User-defined pin selection. 
    
    // PUBLIC METHODS
    void init(); // Initialize TIMER 1, set the PWM to 20kHZ. 
    void setM1Speed(int speed); // Set speed for M1.
    void setSpeeds(int m1Speed, int m2Speed); // Set speed for both M1 and M2.
    void setM1Brake(int brake); // Brake M1. 
    void setBrakes(int m1Brake, int m2Brake); // Brake both M1 and M2.
    unsigned int getM1CurrentMilliamps(); // Get current reading for M1. 
    unsigned char getM1Fault(); // Get fault reading from M1.
    
  private:
    unsigned char _INA1;
    unsigned char _INB1;
    static const unsigned char _PWM1 = 9;
    unsigned char _EN1DIAG1;
    unsigned char _CS1;
};

#endif
