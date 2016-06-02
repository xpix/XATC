#include <Servo.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

char* ssid = ".........";
char* pass = ".........";

/* --------------------------------------- */

int position_zero = 90;
int position  = position_zero;
int target    = 0;
int pin       = 5; // Servo pin
int wait      = 750;
int readpin   = A0;
int repeats   = 3;
int realtarget= 0;
bool failed   = false;



ESP8266WebServer server(80);

Servo myservo;

void setup(void){
  Serial.begin(115200);
  Serial.println("");
  
  WiFi.begin(ssid, pass);
  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  server.on("/", [](){
    server.send(200, "text/plain", "Open /servo?position=120&target=500&wait=500 to control servo or set the target value via /target?value=512");
  });

  // http://ip/servo?position=120&target=500&wait=500
  server.on("/servo", [](){
    String sval;

    sval = server.arg("position");
    position = sval.toInt();

    if(sval = server.arg("target")){
      target = sval.toInt();
    }

    if(sval = server.arg("wait")){
      wait = sval.toInt();
    }

    int i = 1;
    while(setServo(position) == 0 && i++ <= repeats){
      delay(200);
      Serial.println("Failed block, repeat ...");
    }
    if(failed){
      server.send(500, "text/plain", info(position, target, realtarget));
    } else {
      server.send(200, "text/plain", info(position, target, realtarget));
    }
  });

  server.begin();
  Serial.println("HTTP server started");
  
  myservo.attach(pin);          // Servo attached to D5 pin on NodeMCU board
  myservo.write(position_zero); // move servo arm to zero position
}
 
void loop(void){
  server.handleClient();
}

String info(int pos, int tar, int rtar){
  String text = String("Position: " + String(pos, DEC) + "\tTarget: " + String(tar, DEC) + "\tRealTarget: " + String(rtar, DEC) + "\n");
  Serial.print(text);
  return text;
}

int setServo(int pos){
  myservo.write(pos);
  
  // wait x milliseconds
  delay(wait);

  // check value on Analog input
  int rt = average(A0);
  realtarget = rt;
  if(target > 0 && rt < target && rt > (target-50){
    failed = true; // not ok
    myservo.write(position_zero);
    delay(wait);
    return 0;
  }
  failed = false; // ok
  return realtarget;
} 
 
int average(int port){
  int all = 0;
  for (int i = 0; i < 10; i++) {
    all += analogRead(port);
    delay(20);
  }
  return (all / 10);
}