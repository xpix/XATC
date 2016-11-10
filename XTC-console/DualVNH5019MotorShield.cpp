#include "DualVNH5019MotorShield.h"

// Constructors ////////////////////////////////////////////////////////////////

DualVNH5019MotorShield::DualVNH5019MotorShield()
{
  //Pin map
  _INA1 = 2;
  _INB1 = 4;
  _EN1DIAG1 = 6;
  _CS1 = A0; 
}

DualVNH5019MotorShield::DualVNH5019MotorShield(unsigned char INA1, unsigned char INB1, unsigned char EN1DIAG1, unsigned char CS1)
{
  //Pin map
  //PWM1 and PWM2 cannot be remapped because the library assumes PWM is on timer1
  _INA1 = INA1;
  _INB1 = INB1;
  _EN1DIAG1 = EN1DIAG1;
  _CS1 = CS1;
}

// Public Methods //////////////////////////////////////////////////////////////
void DualVNH5019MotorShield::init()
{
// Define pinMode for the pins and set the frequency for timer1.

  pinMode(_INA1,OUTPUT);
  pinMode(_INB1,OUTPUT);
  pinMode(_PWM1,OUTPUT);
  pinMode(_EN1DIAG1,INPUT);
  pinMode(_CS1,INPUT);
  #if defined(__AVR_ATmega168__)|| defined(__AVR_ATmega328P__) || defined(__AVR_ATmega32U4__)
  // Timer 1 configuration
  // prescaler: clockI/O / 1
  // outputs enabled
  // phase-correct PWM
  // top of 400
  //
  // PWM frequency calculation
  // 16MHz / 1 (prescaler) / 2 (phase-correct) / 400 (top) = 20kHz
  TCCR1A = 0b10100000;
  TCCR1B = 0b00010001;
  ICR1 = 400;
  #endif
}
// Set speed for motor 1, speed is a number betwenn -400 and 400
void DualVNH5019MotorShield::setM1Speed(int speed)
{
  unsigned char reverse = 0;
  
  if (speed < 0)
  {
    speed = -speed;  // Make speed a positive quantity
    reverse = 1;  // Preserve the direction
  }
  if (speed > 400)  // Max PWM dutycycle
    speed = 400;
  #if defined(__AVR_ATmega168__)|| defined(__AVR_ATmega328P__) || defined(__AVR_ATmega32U4__)
  OCR1A = speed;
  #else
  analogWrite(_PWM1,speed * 51 / 80); // default to using analogWrite, mapping 400 to 255
  #endif

  if (speed == 0)
  {
    digitalWrite(_INA1,LOW);   // Make the motor coast no
    digitalWrite(_INB1,LOW);   // matter which direction it is spinning.
  }
  else if (reverse)
  {
    digitalWrite(_INA1,LOW);
    digitalWrite(_INB1,HIGH);
  }
  else
  {
    digitalWrite(_INA1,HIGH);
    digitalWrite(_INB1,LOW);
  }
}

// Set speed for motor 1 and 2
void DualVNH5019MotorShield::setSpeeds(int m1Speed, int m2Speed)
{
  setM1Speed(m1Speed);
}

// Brake motor 1, brake is a number between 0 and 400
void DualVNH5019MotorShield::setM1Brake(int brake)
{
  // normalize brake
  if (brake < 0)
  {
    brake = -brake;
  }
  if (brake > 400)  // Max brake
    brake = 400;
  digitalWrite(_INA1, LOW);
  digitalWrite(_INB1, LOW);
  #if defined(__AVR_ATmega168__)|| defined(__AVR_ATmega328P__) || defined(__AVR_ATmega32U4__)
  OCR1A = brake;
  #else
  analogWrite(_PWM1,brake * 51 / 80); // default to using analogWrite, mapping 400 to 255
  #endif
}

// Brake motor 1 and 2, brake is a number between 0 and 400
void DualVNH5019MotorShield::setBrakes(int m1Brake, int m2Brake)
{
  setM1Brake(m1Brake);
}

// Return motor 1 current value in milliamps.
unsigned int DualVNH5019MotorShield::getM1CurrentMilliamps()
{
  long sensorValue = analogRead(_CS1);
  return ((sensorValue * 5000 / 1024) - 510 ) * 1000 / 66;
}

// Return error status for motor 1 
unsigned char DualVNH5019MotorShield::getM1Fault()
{
  return !digitalRead(_EN1DIAG1);
}

