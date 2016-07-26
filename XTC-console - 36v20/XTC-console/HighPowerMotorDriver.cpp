#include "HighPowerMotorDriver.h"

// Datasheet
// http://www.allegromicro.com/en/Products/Motor-Driver-And-Interface-ICs/Brush-DC-Motor-Drivers/~/media/Files/Datasheets/A3941-Datasheet.ashx

// Constructors ////////////////////////////////////////////////////////////////

HighPowerMotorDriver::HighPowerMotorDriver()
{
  //Pin map
  _DIR   = 4;
  _PWML  = 5;
  _PWMH  = 6;
  _FF1   = 7;
  _FF2   = 8;
  _CS    = A7; 
}

HighPowerMotorDriver::HighPowerMotorDriver(
      unsigned char DIR, 
      unsigned char PWMH, 
      unsigned char PWML, 
      unsigned char FF1,
      unsigned char FF2,
      unsigned char CS)
{
   //Pin map
   //PWM1 and PWM2 cannot be remapped because the library assumes PWM is on timer1
   _DIR  = DIR;
   _PWMH = PWMH;
   _PWML = PWML;
   _FF1  = FF1;
   _FF2  = FF2;  
}

// Public Methods //////////////////////////////////////////////////////////////
void HighPowerMotorDriver::init()
{
// Define pinMode for the pins and set the frequency for timer1.

  pinMode(_DIR,   OUTPUT);
  pinMode(_PWMH,  OUTPUT);
  pinMode(_PWML,  OUTPUT);
  pinMode(_FF1,   INPUT);
  pinMode(_FF2,   INPUT);
  pinMode(_CS,    INPUT);


  /*
  Sign-magnitude (drive-brake):  With PWML  disconnected or  held high,  apply a
  pulse-width-modulated (PWM) signal to the PWMH pin. The duty cycle of the  PWM
  controls the speed of the motor and the DIR pin controls the direction. During
  the active (high)  portion of the  PWM, the motor  outputs drive the  motor by
  putting the full V+  voltage across the motor  in the direction determined  by
  the DIR pin; during  the low portion of  the PWM, the motor  outputs brake the
  motor by shorting both  motor terminals to ground.  This means that the  motor
  alternates between drive and brake at the PWM frequency with the percentage of
  the driving time determined by the duty cycle.
  */

  digitalWrite(_PWML, HIGH); // default to on
}

// Set speed for motor, speed is a number betwenn -400 and 400
void HighPowerMotorDriver::setSpeed(int speed)
{
  unsigned char reverse = 0;
  digitalWrite(_PWML,1);
  
  if (speed < 0)
  {
    speed = -speed;  // Make speed a positive quantity
    reverse = 1;  // Preserve the direction
  }
  if (speed > 400)  // Max PWM dutycycle
    speed = 400;
  analogWrite(_PWMH,speed * 51 / 80); // default to using analogWrite, mapping 400 to 255
  if (reverse)
    digitalWrite(_DIR,HIGH);
  else
    digitalWrite(_DIR,LOW);
}

// Set speed for motor, speed is a number betwenn -400 and 400
void HighPowerMotorDriver::setBrake()
{
    analogWrite(_PWMH,255);
    digitalWrite(_PWML,0);
}

// Return motor 1 current value in milliamps.
double HighPowerMotorDriver::getCurrentMilliamps()
{
  int sensorValue = analogRead(_CS); // 0.00 // Read  analog value
  // convert to milli amps
  float outputValue =  (sensorValue  - 512) * 0.037054326; // 0.074054326 /2 seems better
  return abs(outputValue*1000);
 }

// Return error status
unsigned char HighPowerMotorDriver::getFault()
{
   bool ff1 = digitalRead(_FF1);
   bool ff2 = digitalRead(_FF2);
   if(!ff1 && ff2){
      return 1; // Short circuit
   }
   if(ff1 && !ff2){
      return 2; // Over temperature
   }
   if(ff1 && ff2){
      return 3; // Under Voltage
   }

   return 0;
}

