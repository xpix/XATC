/*
The XTC Console program to communicate between chilipeppr and motordriver. 
Use a normal arduino nano at this time and send textcommands (a kind of g-code for spindle)
*/

// Demo Code for SerialCommand Library Steven Cogswell May 2011
// https://github.com/scogswell/ArduinoSerialCommand

#include <SerialCommand.h>
#include "DualVNH5019MotorShield.h"
#include "Timer.h"

#define arduinoLED 13         // Arduino LED on board
#define defaultSpeed 100      // Default speed for spindle
#define defaultBreak 400      // Default power for breake 
#define interval 50          // interval in milliseconds to test the motor current

int level   = 0;
int currentEvent;
int debugEvent;


SerialCommand SCmd;        // The SerialCommand object
DualVNH5019MotorShield md; // The motor driver
Timer timer;               // The timer object

// fwd 400 500
void spindle_forward()
{
  int speed = defaultSpeed;
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      speed = atol(arg);
  }

  // Timer parameter 
  arg = SCmd.next();
  if (arg != NULL){
    callTimer(atol(arg));
  }

  md.setM1Speed(speed);
  ok();
}

// bwd 400 500
void spindle_backward()
{
  int speed = (0 - defaultSpeed);
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      speed = (0 - atol(arg));
  }

  // Timer parameter 
  arg = SCmd.next();
  if (arg != NULL){
    callTimer(atol(arg));
  }

  md.setM1Speed(speed);
  ok();
}

// brk 300
void spindle_break()
{
  int breake = defaultBreak;
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      breake = atol(arg);
  }
  md.setM1Brake(breake);
  ok();
}

void set_dbg(){
  if(debugEvent){
      timer.stop(debugEvent);
      debugEvent = 0;
  }
  else {
      debugEvent = timer.every(interval, spindle_status);
  }
  ok();   
}

// sta
void spindle_status()
{
  char fault = md.getM1Fault();
  int  ma    = md.getM1CurrentMilliamps();

  Serial.print("Cur: "); 
  Serial.print(ma); 
  Serial.print(" mA"); 
  Serial.print("\t"); 

  Serial.print("Lev: "); 
  Serial.print(level); 
  Serial.print("\t"); 

  Serial.println((fault ? "error" : "ok")); 
}

// lev 3000
void spindle_set_breaklevel(){
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg == NULL)      // As long as it existed, take it
  {
     Serial.print(F("lev: ")); 
     Serial.println(level); 
  }
  else{
      level = atol(arg);
  }
  ok();   
}

// tim 1000
// stop spindle after x milliseconds
void spindle_set_stoptime(){
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg == NULL)      // As long as it existed, take it
  {
     Serial.print(F("tim: millisceonds")); 
  }
  else{
      int time = atol(arg);
      int waitEvent = callTimer(time);
  }
  ok();   
}

int callTimer(int time){
  return timer.after(time, spindle_break);
}

void ok(){
  Serial.println("OK"); 
}

void checkCurrent(){
   if( level > 0 && md.getM1CurrentMilliamps() >= level){
      timer.stop(currentEvent);
      md.setM1Brake(400); // full brake
      level = 0;          // reset level
      currentEvent = timer.every(interval, checkCurrent);
   }

   if( level < 0 && md.getM1CurrentMilliamps() <= (0 - level)){
      timer.stop(currentEvent);
      md.setM1Brake(400); // full brake
      level = 0;          // reset level
      currentEvent = timer.every(interval, checkCurrent);
   }
}

void set_led(){
  if(digitalRead(arduinoLED)){
      digitalWrite(arduinoLED,LOW);
  }
  else {
      digitalWrite(arduinoLED,HIGH);
  }
  ok();   
}

// This gets set as the default handler, and gets called when no other command matches. 
void unrecognized()
{
  Serial.println(F("? use commands: fwd[I], bwd[I], brk[I], sta, lev, tim[ms], led, dbg")); 
}

void setup()
{  
  pinMode(arduinoLED,OUTPUT);      // Configure the onboard LED for output
  digitalWrite(arduinoLED,LOW);    // default to LED off

  Serial.begin(115200); 

  // Initialize motordriver
  md.init();

  // Setup callbacks for SerialCommand commands 
  SCmd.addCommand("fwd",spindle_forward);       // Turns spindle on and rotate forward
  SCmd.addCommand("bwd",spindle_backward);      // Turns spindle on and rotate forward
  SCmd.addCommand("brk",spindle_break);         // Turns Spindle w/ break power or defaultBreak
  SCmd.addCommand("sta",spindle_status);        // get milliamps and direction ...
  SCmd.addCommand("lev",spindle_set_breaklevel);// Set the level off millAmpere , the spindle will break
  SCmd.addCommand("tim",spindle_set_stoptime);  // Set delay to stop
  SCmd.addCommand("led",set_led);  // Set delay to stop
  SCmd.addCommand("dbg",set_dbg);  // Set debug output

  // Interval to read current and stop spindle if rise over level
  currentEvent = timer.every(interval, checkCurrent);


  SCmd.addDefaultHandler(unrecognized);  // Handler for command that isn't matched  (says "What?") 
  Serial.println(F("XTC-Console 0.1 ready")); 

}

void loop()
{  
  SCmd.readSerial();     // We don't do much, just process serial commands
  
  timer.update();
}


