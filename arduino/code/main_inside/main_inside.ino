#include <SoftwareSerial.h>
#include <DHT.h>
#include <DHT_U.h>



#define ESPPIN_TX 2     // ESP 8266 모듈의 TX 핀
#define ESPPIN_RX 3     // ESP 8266 모듈의 RX 핀

#define DHTPIN 7        // DHT11 핀 
#define DHTTYPE DHT11   // DHT 모듈 종류

#define CDS_D 4         // CDS 모듈 디지털 핀
#define CDS_A A0        // CDS 모듈 아날로그 핀

uint32_t delayMS;       // 센서를 읽는 지연시간


SoftwareSerial esp(ESPPIN_TX,ESPPIN_RX);
DHT_Unified dht(DHTPIN, DHTTYPE);


String SSID = "Wifi_SSID";        // Wifi - SSID
String SSPW = "Wifi_SSPW";        // Wifi - SSPW

String EUEIP = "EUE_IP";          // Web Server - IP
int EUEPORT = 8081;               // Web Server - Port

void connectESP();
void connectWifi();
void sendData(String vars);


void setup() {

  pinMode(CDS_D, INPUT);  // CDS모듈의 Pinmode를 Input으로 설정
  
  Serial.begin(9600);     // Serial monitor의 통신 속도 9600으로 설정
  esp.begin(9600);        // esp모듈의 통신 속도 9600으로 설정

  connectESP();           // ESP 모듈 탐색
  connectWifi();          // ESP 모듈 wifi 연결

  dht.begin();            // DHT11 센서 작동 시작
  Serial.println("DHT11 Unified Sensor Start.");

  sensor_t sensor;        // dht11 구조체 생성

  // 온도센서 정보 출력
  dht.temperature().getSensor(&sensor);
  Serial.println("------------------------------------");
  Serial.println("Temperature(온도)");
  Serial.print("Sensor : ");Serial.println(sensor.name);
  Serial.print("Drive Ver : ");Serial.println(sensor.version);
  Serial.print("Unique ID : ");Serial.println(sensor.sensor_id);
  Serial.print ("Max Value : "); Serial.print(sensor.max_value); Serial.println(" *C");
  Serial.print ("Min Value : "); Serial.print(sensor.min_value); Serial.println(" *C");
  Serial.print ("Resolution : "); Serial.print(sensor.resolution); Serial.println(" *C");  
  Serial.println("------------------------------------");

  // 습도센서 정보 프린트
  dht.humidity().getSensor(&sensor);
  Serial.println("------------------------------------");
  Serial.println("Humidity(습도)");
  Serial.print ("Sensor : "); Serial.println(sensor.name);
  Serial.print ("Driver Ver : "); Serial.println(sensor.version);
  Serial.print ("Unique ID : "); Serial.println(sensor.sensor_id);
  Serial.print ("Max Value : "); Serial.print(sensor.max_value); Serial.println("%");
  Serial.print ("Min Value : "); Serial.print(sensor.min_value); Serial.println("%");
  Serial.print ("Resolution : "); Serial.print(sensor.resolution); Serial.println("%");  
  Serial.println("------------------------------------");

  delayMS =sensor.min_delay /1000;                    // 센서를 읽는 시간을 최소로 설정
}

void loop() {
  String input = "";

  // 측정기 분류(IN / OUT)
  String type_ = "In";

  // 사용자 ID
  String ID = "Admin";

  // 지역 코드
  String locCode = "3743011";
  
  // DHT11 모듈의 측정 event
  sensors_event_t event;
  
  // 온도
  dht.temperature().getEvent(&event);
  float temp = event.temperature;
  String str_Temp = String(temp);

  // 습도
  dht.humidity().getEvent(&event);
  float humi = event.relative_humidity;
  String str_Humi = String(humi);

  // 광도
  int lights = analogRead(CDS_A);
  String str_Lights = String(lights);
  
  input += "type=" + type_;
  input += "&id=" + ID;
  input += "&locCode" + locCode;
  input += "&temp=" + str_Temp;
  input += "&humi=" + str_Humi;
  input += "&lights=" + str_Lights;
  Serial.println(input);
  
  // 데이터 전송
  sendData(input);

  // 10분마다 전송 진행
  delay(600000);
}

// ESP모듈 연결
void connectESP(){
  esp.println("AT");
  Serial.println("AT Sent");
  while(!esp.find("OK")){
    esp.println("AT");
    Serial.println("ESP8266 Not Found.");
  }
  Serial.println("OK Command Received.");
}

// 공유기와 연결
void connectWifi(){
  // ESP8266 모듈 Client로 설정
  String cmd = "AT+CWMODE=1";
  esp.println(cmd);
  Serial.println("Set ESP8266 to client.");

  // 공유기와 연결
  Serial.println("Connecting to Wifi...");
  cmd = "AT+CWJAP=\"" + SSID + "\"," + SSPW + "\"";
  esp.println(cmd);
  
  // 연결 확인
  while(!esp.find("OK"));
  Serial.println("Wifi Connected");
  
  // 연결된 공유기 확인
  cmd = "AT+CWJAP?";
  esp.println(cmd);
  Serial.write(esp.read());
}

void sendData(String input){
  // ESP 모듈을 통해 Server와 연결
  esp.println("AT+CIPSTART=\"TCP\",\"" + EUEIP + "\"," + EUEPORT);
  if(esp.find("Error")){
    Serial.println("AT+CIPSTART Error...");
  }

  // 서버로 전송할 데이터 작성
  String vars = input;
  
  String msg = "GET /data/input?";
  msg += vars;
  msg += " HTTP/1.0\r\n\r\n";
  esp.print("AT+CIPSEND=");
  esp.println(msg.length());
  delay(2000);

  // 데이터 전송
  if(esp.find(">")){
    esp.print(msg);
    Serial.println("Data sent.");
    delay(1000);
  }

  // 서버와 연결 종료
  Serial.println("Connection Closed.");
  esp.println("AT+CIPCLOSE");
}
