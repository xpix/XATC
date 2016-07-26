#ifndef HighPowerMotorDriver_h
#define HighPowerMotorDriver_h

#include <Arduino.h>

class HighPowerMotorDriver
{
  public:  
    // CONSTRUCTORS
    HighPowerMotorDriver(); // Default pin selection.
    HighPowerMotorDriver(
      unsigned char DIR, 
      unsigned char PWMH, 
      unsigned char PWML, 
      unsigned char FF1,
      unsigned char FF2,
      unsigned char CS
    ); // User-defined pin selection. 
    
    // PUBLIC METHODS
    void init(); // Initialize TIMER 1, set the PWM to 20kHZ. 
    void setSpeed(int speed); // Set speed for M1.
    void setBrake();
    double getCurrentMilliamps(); // Get current reading for M1. 
    unsigned char getFault(); // Get fault reading.

  private:
    unsigned char _DIR;
    unsigned char _PWMH;
    unsigned char _PWML;
    unsigned char _FF1;
    unsigned char _FF2;
    unsigned char _CS;
};

#endif
