#include "DualVNH5019MotorShield.h"

DualVNH5019MotorShield md;

void stopIfFault()
{
  if (md.getM1Fault())
  {
    Serial.println("M1 fault");
    while(1);
  }
}

void setup()
{
  Serial.begin(115200);
  Serial.println("Dual VNH5019 Motor Shield");
  md.init();
}

void loop()
{
  for (int i = -50; i <= 50; i++)
  {
    md.setM1Speed(i);
    stopIfFault();
    Serial.print("M1 current: ");
    Serial.println(md.getM1CurrentMilliamps());
    delay(20);
  }

  for (int i = 50; i >= -50; i--)
  {
    md.setM1Speed(i);
    stopIfFault();
    Serial.print("M1 current: ");
    Serial.println(md.getM1CurrentMilliamps());
    delay(20);
  }
  
}
