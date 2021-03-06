/*
The XTC Console program to communicate between chilipeppr and motordriver. 
Use a normal arduino nano at this time and send textcommands (a kind of g-code for spindle)
Please use this DC Controller (30A High Power Single way H-bridge DC Motor Driver Module) http://www.ebay.com/itm/131528092776 
and a ACS712 Current sensor

Use this pinout:
ACS712: 
  VCC --> 5V
  SIG --> A0
  3.3 --> A5
  GND --> GND

DC Controller
  GND --> GND
  PA  --> D9
  A1  --> D2
  A2  --> D4

PWM Signal from CNC Controller
  PWM --> D3
  GND --> GND
  
*/

// Demo Code for SerialCommand Library Steven Cogswell May 2011
// https://github.com/scogswell/ArduinoSerialCommand

#include "SerialCommand.h"
#include "HighPowerMotorDriver.h"
#include "Timer.h"
#include <Servo.h>


#define servoPin A0           // Arduino Servo Pin
#define arduinoLED 13         // Arduino LED on board
#define pwmPin 3              // PWM read pin

#define defaultSpeed 100      // Default speed for spindle
#define defaultBreak 400      // Default power for breake 
#define interval 50           // interval in milliseconds to test the motor current

int level   = 0;
int currentEvent;
int debugEvent;
int speed;
int saved_speed;
int pwm_value;
int speedTimer;


SerialCommand SCmd;        // The SerialCommand object
HighPowerMotorDriver md;
Timer timer;               // The timer object
Servo myservo;                // create servo object to control a servo

void servo_control()
{
  int pos = 91;
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      pos = atol(arg);
  }

  spindle_pwm(false);
  myservo.write(pos); 
  delay(100);   

  ok();
}


// fwd 400 500
void spindle_forward()
{
  speed = defaultSpeed;
  spindle_pwm(false);

  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      speed = atol(arg);
  }
  else if(saved_speed) {
      speed = saved_speed;
  }

  // Timer parameter 
  arg = SCmd.next();
  int timee = 0;
  if (arg != NULL){
    timee = atol(arg);
    callTimer(timee);
  }

  spindle_status(speed, timee);

  md.setSpeed(speed);
  ok();
}

// bwd 400 500
void spindle_backward()
{
  speed = (0 - defaultSpeed);
  spindle_pwm(false);

  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      speed = (0 - atol(arg));
  }
  else if(saved_speed) {
      speed = saved_speed;
  }

  // Timer parameter 
  arg = SCmd.next();
  int timee = 0;
  if (arg != NULL){
    timee = atol(arg);
    callTimer(timee);
  }

  spindle_status(speed, timee);

  md.setSpeed(speed);
  ok();
}

void spindle_jitter()
{
  int time = 0;
  int speed = 0;
  spindle_pwm(false);

  // Speed parameter 
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      speed = atol(arg);
  }

  // Timer parameter 
  arg = SCmd.next();
  if (arg != NULL){
    time = atol(arg);
  }

  // jitter one times forward i.e. speed 200 - time 100ms
  saved_speed = speed;
  spindle_forward();                      // drive spindle forward
  timer.after(time, spindle_break);       // 100ms: break spindle

  // ... and backward
  saved_speed = (0 - speed);
  timer.after(time+10, spindle_backward); // 110ms: drive spindle backward
  timer.after((time*2)+10, spindle_break);// 210ms: break spindle
}

// brk 300
void spindle_break()
{
  int breake = defaultBreak;
  spindle_pwm(false);

  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      breake = atol(arg);
  }

  spindle_status(0, -1);
  
  md.setBrake();
  ok();
}

void set_dbg(){
  int dbg_interval = interval;
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg != NULL)      // As long as it existed, take it
  {
      dbg_interval = atol(arg);
  }
  if(debugEvent){
      timer.stop(debugEvent);
      debugEvent = 0;
  }
  else {
      debugEvent = timer.every(dbg_interval, spindle_status);
  }
  ok();   
}

// sta
void spindle_status()
{
  spindle_status(0,0);
}

void spindle_status(int speed, int timee)
{
  int ma    = md.getCurrentMilliamps();

  Serial.print("Sp: "); 
  Serial.print(speed); 
  Serial.print("\t"); 

  Serial.print("PWM: "); 
  Serial.print(pwm_value); 
  Serial.print("\t"); 

  Serial.print("Tim: "); 
  Serial.print(timee); 
  Serial.print(" ms"); 
  Serial.print("\t"); 

  Serial.print("Cur: "); 
  Serial.print(ma); 
  Serial.print(" mA"); 
  Serial.print("\t"); 

  Serial.print("Lev: "); 
  Serial.print(level); 

  Serial.println(); 
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
   if( level > 0 && md.getCurrentMilliamps() >= level){
      timer.stop(currentEvent);
      md.setBrake(); // full brake
      level = 0;          // reset level
      currentEvent = timer.every(interval, checkCurrent);
   }

   if( level < 0 && md.getCurrentMilliamps() <= (0 - level)){
      timer.stop(currentEvent);
      md.setBrake(); // full brake
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

void spindle_pwm(){
  char *arg = SCmd.next();    // Get the next argument from the SerialCommand object buffer
  if (arg == NULL)            // As long as it existed, take it
  {
     spindle_pwm(true);
  }
  else
  {
     spindle_pwm(false);
  }
}

void spindle_pwm(bool active){
   if(active){
      // set a timer he read the pwm signal and set the spindle speed
      if(pwm_value > 0){
        md.setSpeed(pwm_value);
      } else {
        md.setSpeed(0);
      }
      speedTimer = timer.after(250, spindle_pwm);
   }else{
      if(speedTimer){
         timer.stop(speedTimer);
         speedTimer = 0;
         md.setSpeed(0);
      }
   }
}


// This gets set as the default handler, and gets called when no other command matches. 
void unrecognized()
{
  Serial.println(F("? use commands: fwd[S,T], bwd[S,T], jit[S,T] brk[I], sta, lev, tim[ms], srv[deg], dbg, sav, rem")); 
}

void setup()
{  
  pinMode(arduinoLED,OUTPUT);      // Configure the onboard LED for output
  digitalWrite(arduinoLED,LOW);    // default to LED off

  pinMode(pwmPin, INPUT);          // Pin to read PWM Value from CNC Controller

  Serial.begin(115200); 

  // Initialize Servo
  myservo.attach(servoPin);

  // Initialize motordriver
  md.init();

  // Setup callbacks for SerialCommand commands 
  SCmd.addCommand("srv",servo_control);         // Send commands to servo
  SCmd.addCommand("fwd",spindle_forward);       // Turns spindle on and rotate forward
  SCmd.addCommand("bwd",spindle_backward);      // Turns spindle on and rotate backward
  SCmd.addCommand("jit",spindle_jitter);        // Turns spindle rotate forward and backward
  SCmd.addCommand("brk",spindle_break);         // Turns Spindle w/ break power or defaultBreak
  SCmd.addCommand("sta",spindle_status);        // get milliamps and direction ...
  SCmd.addCommand("lev",spindle_set_breaklevel);// Set the level off millAmpere , the spindle will break
  SCmd.addCommand("tim",spindle_set_stoptime);  // Set delay to stop
  SCmd.addCommand("led",set_led);               // Set led on/off
  SCmd.addCommand("dbg",set_dbg);               // Set debug output
  SCmd.addCommand("pwm",spindle_pwm);           // set  --- "" --------

  // Interval to read current and stop spindle if rise over level
  currentEvent = timer.every(interval, checkCurrent);


  SCmd.addDefaultHandler(unrecognized);  // Handler for command that isn't matched  (says "What?") 
  Serial.println(F("XTC-Console 0.2 ready")); 

}


// Define the number of samples to keep track of.  The higher the number,
// the more the readings will be smoothed, but the slower the output will
// respond to the input.  Using a constant rather than a normal variable lets
// use this value to determine the size of the readings array.
const int numReadings = 10;

int readings[numReadings];      // the readings from the analog input
int readIndex = 0;              // the index of the current reading
int total = 0;                  // the running total

void loop()
{  
  SCmd.readSerial();     // We don't do much, just process serial commands

  // read sindle speed PWM pin and translate from 0 ... 400 
  /*
   * 0rpm or off    =     <1100
   * 1000rpm        =     1245
   * 12000rpm       =     2000
   */
  int pwm = pulseIn(pwmPin, HIGH);

  // subtract the last reading:
  total = total - readings[readIndex];
  // read from the sensor:
  readings[readIndex] = pwm;
  // add the reading to the total:
  total = total + readings[readIndex];
  // advance to the next position in the array:
  readIndex = readIndex + 1;

  // if we're at the end of the array...
  if (readIndex >= numReadings) {
    pwm_value = map(total / numReadings, 1100, 2000, 0, 40)*10;
    //pwm_value = total / numReadings;

    // ...wrap around to the beginning:
    readIndex = 0;
  }

  // calculate the average:
  delay(1);
  
  timer.update();
}



