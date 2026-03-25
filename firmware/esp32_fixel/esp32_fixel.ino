/**
 * ============================================================
 * ESP32 Firmware — App-Fixel Refrigerator Monitor
 * ============================================================
 *
 * Sensor: DHT11 (temperatura y humedad)
 * Comunicación: MQTT (con TLS opcional) → Backend Node.js → PostgreSQL
 * Funcionalidades:
 *   - Lectura de temperatura y humedad cada 5 segundos
 *   - Cálculo de temperatura mínima y máxima registradas
 *   - Evaluación de estado: NORMAL, ALTA, BAJA
 *   - Activación de buzzer cuando la temperatura sale del rango
 *   - Publicación de datos vía MQTT al backend
 *   - Servidor HTTP local para pruebas (/api/temperatura)
 *
 * Tópico MQTT: fixel/{DEVICE_ID}/data
 * Formato JSON:
 *   {
 *     "temperatura": 5.2,
 *     "humedad": 65,
 *     "compresor": true,
 *     "energia": "Normal",
 *     "estado": "NORMAL",
 *     "min": 3.1,
 *     "max": 7.8
 *   }
 *
 * ============================================================
 * LIBRERÍAS NECESARIAS (instalar desde Arduino IDE):
 *   - DHT sensor library (by Adafruit)
 *   - Adafruit Unified Sensor
 *   - PubSubClient (by Nick O'Leary)
 *   - ArduinoJson (by Benoit Blanchon)
 * ============================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURACIÓN — Modificar según tu instalación
// ============================================================

// WiFi
const char* WIFI_SSID     = "TU_SSID_WIFI";
const char* WIFI_PASSWORD  = "TU_PASSWORD_WIFI";

// MQTT Broker (mismo broker configurado en backend/.env)
const char* MQTT_BROKER   = "tu-broker.com";      // ej: broker.hivemq.com
const int   MQTT_PORT     = 1883;                  // 1883 sin TLS, 8883 con TLS
const char* MQTT_USER     = "";                    // Usuario MQTT (si aplica)
const char* MQTT_PASS     = "";                    // Password MQTT (si aplica)

// Backend HTTP (fallback cuando MQTT no está disponible)
// El ESP32 puede enviar datos vía POST /api/ingest/{DEVICE_ID}
const char* BACKEND_URL   = "";                    // ej: "https://tu-backend.com"
const bool  HTTP_FALLBACK = true;                  // true = enviar por HTTP si MQTT falla

// Identificador del dispositivo — Debe coincidir con el device_id
// registrado en la app (ej: "FRIDGE-A1B2")
const char* DEVICE_ID     = "FRIDGE-0001";

// Prefijo de tópico MQTT (debe coincidir con MQTT_TOPIC_PREFIX del backend)
const char* TOPIC_PREFIX  = "fixel";

// Sensor DHT11
#define DHT_PIN    4        // GPIO conectado al pin DATA del DHT11
#define DHT_TYPE   DHT11

// Buzzer
#define BUZZER_PIN 5        // GPIO conectado al buzzer

// LED indicador (opcional, usa el LED integrado del ESP32)
#define LED_PIN    2

// Límites de temperatura (°C) — Se pueden ajustar desde la app
float LIMITE_MIN = 2.0;
float LIMITE_MAX = 8.0;

// Intervalo de lectura en milisegundos
const unsigned long INTERVALO_LECTURA = 5000;   // 5 segundos
const unsigned long INTERVALO_MQTT    = 10000;  // 10 segundos entre publicaciones MQTT

// Puerto del servidor HTTP local
const int HTTP_PORT = 80;

// ============================================================
// VARIABLES GLOBALES
// ============================================================

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(HTTP_PORT);

// Datos de temperatura
float temperatura    = 0.0;
float humedad        = 0.0;
float tempMin        = 999.0;   // Se actualiza con la primera lectura
float tempMax        = -999.0;  // Se actualiza con la primera lectura
String estado        = "NORMAL";
bool  compresor      = false;
String energia       = "Normal";
bool  buzzerActivo   = false;
bool  sensorOk       = false;

// Temporizadores
unsigned long ultimaLectura = 0;
unsigned long ultimoMqtt    = 0;

// Tópico MQTT construido dinámicamente
char mqttTopic[64];

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  App-Fixel — ESP32 Monitor de Refrigerador");
  Serial.println("========================================");

  // Configurar pines
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  // Inicializar sensor DHT11
  dht.begin();
  Serial.println("✅ Sensor DHT11 inicializado en GPIO " + String(DHT_PIN));

  // Construir tópico MQTT
  snprintf(mqttTopic, sizeof(mqttTopic), "%s/%s/data", TOPIC_PREFIX, DEVICE_ID);
  Serial.println("📡 Tópico MQTT: " + String(mqttTopic));

  // Conectar WiFi
  conectarWiFi();

  // Configurar MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512);  // Buffer para mensajes JSON grandes

  // Configurar servidor HTTP local
  configurarHTTP();

  Serial.println("✅ Sistema listo\n");
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

void loop() {
  unsigned long ahora = millis();

  // Mantener conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  // Mantener conexión MQTT
  if (!mqttClient.connected()) {
    conectarMQTT();
  }
  mqttClient.loop();

  // Servidor HTTP local
  server.handleClient();

  // Leer sensor cada INTERVALO_LECTURA ms
  if (ahora - ultimaLectura >= INTERVALO_LECTURA) {
    ultimaLectura = ahora;
    leerSensor();
  }

  // Publicar MQTT cada INTERVALO_MQTT ms
  if (ahora - ultimoMqtt >= INTERVALO_MQTT) {
    ultimoMqtt = ahora;
    if (sensorOk) {
      publicarMQTT();
    }
  }
}

// ============================================================
// LECTURA DEL SENSOR
// ============================================================

void leerSensor() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  // Verificar si la lectura es válida
  if (isnan(t) || isnan(h)) {
    Serial.println("⚠️  Error leyendo sensor DHT11");
    sensorOk = false;
    return;
  }

  sensorOk = true;
  temperatura = t;
  humedad = h;

  // Actualizar mínima y máxima registradas
  if (temperatura < tempMin) tempMin = temperatura;
  if (temperatura > tempMax) tempMax = temperatura;

  // Evaluar estado según límites
  evaluarEstado();

  // Controlar buzzer
  controlarBuzzer();

  // Log en consola serial
  Serial.printf("🌡️  Temp: %.1f°C | 💧 Hum: %.1f%% | Estado: %s | Min: %.1f | Max: %.1f\n",
    temperatura, humedad, estado.c_str(), tempMin, tempMax);
}

// ============================================================
// EVALUACIÓN DE ESTADO (Lógica del ESP32 original)
// ============================================================

void evaluarEstado() {
  if (temperatura > LIMITE_MAX) {
    estado = "ALTA";
    compresor = true;   // Compresor se enciende para enfriar
  } else if (temperatura < LIMITE_MIN) {
    estado = "BAJA";
    compresor = false;  // Compresor apagado, ya está frío
  } else {
    estado = "NORMAL";
    compresor = true;   // Compresor funciona normalmente
  }
}

// ============================================================
// CONTROL DEL BUZZER
// ============================================================

void controlarBuzzer() {
  if (estado == "ALTA" || estado == "BAJA") {
    if (!buzzerActivo) {
      digitalWrite(BUZZER_PIN, HIGH);
      buzzerActivo = true;
      Serial.println("🔔 Buzzer ACTIVADO — Temperatura fuera de rango");
    }
  } else {
    if (buzzerActivo) {
      digitalWrite(BUZZER_PIN, LOW);
      buzzerActivo = false;
      Serial.println("🔕 Buzzer DESACTIVADO — Temperatura normal");
    }
  }

  // LED indicador: parpadea si hay alerta
  if (estado != "NORMAL") {
    digitalWrite(LED_PIN, (millis() / 500) % 2);  // Parpadeo cada 500ms
  } else {
    digitalWrite(LED_PIN, HIGH);  // LED fijo = todo OK
  }
}

// ============================================================
// PUBLICACIÓN MQTT
// ============================================================

void publicarMQTT() {
  // Construir JSON con ArduinoJson
  JsonDocument doc;
  doc["temperatura"] = round(temperatura * 10.0) / 10.0;
  doc["humedad"]     = round(humedad * 10.0) / 10.0;
  doc["compresor"]   = compresor;
  doc["energia"]     = energia;
  doc["device_code"] = DEVICE_ID;

  char buffer[256];
  size_t len = serializeJson(doc, buffer);

  bool enviado = false;

  // Intentar enviar por MQTT primero
  if (mqttClient.connected()) {
    if (mqttClient.publish(mqttTopic, buffer, len)) {
      Serial.println("📤 MQTT publicado: " + String(buffer));
      enviado = true;
    } else {
      Serial.println("❌ Error publicando MQTT");
    }
  }

  // Fallback: enviar por HTTP POST si MQTT no disponible
  if (!enviado && HTTP_FALLBACK && strlen(BACKEND_URL) > 0) {
    enviarHTTP(buffer);
  }
}

// ============================================================
// ENVÍO HTTP POST (fallback cuando MQTT no está disponible)
// Endpoint: POST {BACKEND_URL}/api/ingest/{DEVICE_ID}
// ============================================================

void enviarHTTP(const char* jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/ingest/" + String(DEVICE_ID);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);

  if (httpCode >= 200 && httpCode < 300) {
    Serial.println("📤 HTTP POST enviado: " + String(jsonPayload));
  } else {
    Serial.println("❌ Error HTTP POST (código: " + String(httpCode) + ")");
  }

  http.end();
}

// ============================================================
// SERVIDOR HTTP LOCAL (para pruebas y dashboard web local)
// ============================================================

void configurarHTTP() {
  // Endpoint API: Datos de temperatura en JSON
  server.on("/api/temperatura", HTTP_GET, []() {
    JsonDocument doc;
    doc["temperatura"] = round(temperatura * 10.0) / 10.0;
    doc["humedad"]     = round(humedad * 10.0) / 10.0;
    doc["min"]         = round(tempMin * 10.0) / 10.0;
    doc["max"]         = round(tempMax * 10.0) / 10.0;
    doc["estado"]      = estado;
    doc["compresor"]   = compresor;
    doc["energia"]     = energia;
    doc["deviceId"]    = DEVICE_ID;

    char buffer[256];
    serializeJson(doc, buffer);

    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", buffer);
  });

  // Endpoint: Reset min/max
  server.on("/api/reset", HTTP_GET, []() {
    tempMin = temperatura;
    tempMax = temperatura;

    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"mensaje\":\"Min/Max reiniciados\"}");
  });

  // Endpoint: Estado del sistema
  server.on("/api/status", HTTP_GET, []() {
    JsonDocument doc;
    doc["wifi"]       = WiFi.isConnected();
    doc["mqtt"]       = mqttClient.connected();
    doc["sensor"]     = sensorOk;
    doc["ip"]         = WiFi.localIP().toString();
    doc["rssi"]       = WiFi.RSSI();
    doc["uptime"]     = millis() / 1000;
    doc["deviceId"]   = DEVICE_ID;

    char buffer[256];
    serializeJson(doc, buffer);

    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", buffer);
  });

  // Página principal: Dashboard HTML local
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", generarDashboardHTML());
  });

  server.begin();
  Serial.println("🌐 Servidor HTTP en http://" + WiFi.localIP().toString());
}

// ============================================================
// DASHBOARD HTML LOCAL (embebido en el ESP32)
// ============================================================

String generarDashboardHTML() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fixel - Monitor de Refrigerador</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(180deg, #1f2b3a, #0f1824);
    color: white; min-height: 100vh; padding: 20px;
  }
  h1 { text-align: center; color: #00e5ff; margin-bottom: 20px; font-size: 24px; }
  .card {
    background: rgba(0,229,255,0.08); border: 2px solid rgba(0,229,255,0.2);
    border-radius: 12px; padding: 20px; margin-bottom: 16px;
  }
  .card h2 { color: #00e5ff; font-size: 16px; margin-bottom: 12px; }
  .temp { font-size: 48px; font-weight: 700; text-align: center;
    background: linear-gradient(135deg, #00e5ff, #19d3d3);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  #alerta { text-align: center; font-size: 18px; font-weight: 600; }
  .grid { display: flex; gap: 12px; margin-bottom: 16px; }
  .box { flex: 1; border-radius: 12px; padding: 16px; text-align: center; }
  .box h3 { font-size: 13px; margin-bottom: 8px; }
  .box div { font-size: 22px; font-weight: 700; }
  .min { background: rgba(0,229,255,0.1); border: 2px solid rgba(0,229,255,0.2); }
  .min h3 { color: #00e5ff; }
  .min div { color: #19d3d3; }
  .max { background: rgba(255,107,157,0.1); border: 2px solid rgba(255,107,157,0.2); }
  .max h3 { color: #ff6b9d; }
  .max div { color: #ff3d6e; }
  .chart-container { position: relative; height: 200px; width: 100%; }
</style>
</head>
<body>

<h1>🧊 Fixel Monitor</h1>

<div class="card">
  <h2>🌡️ Temperatura Actual</h2>
  <h2 id="alerta">Estado: --</h2>
  <div class="temp" id="temp">-- °C</div>
</div>

<div class="grid">
  <div class="box min">
    <h3>❄️ Mínimo</h3>
    <div id="min">--</div>
  </div>
  <div class="box max">
    <h3>🔥 Máximo</h3>
    <div id="max">--</div>
  </div>
</div>

<div class="card">
  <h2>📊 Historial</h2>
  <div class="chart-container">
    <canvas id="grafica"></canvas>
  </div>
</div>

<script>
let datos = [];

const ctx = document.getElementById("grafica");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Temperatura (°C)",
      data: datos,
      borderColor: "#00e5ff",
      backgroundColor: "rgba(0, 229, 255, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2
    }]
  },
  options: {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 8 },
           grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: 'rgba(255,255,255,0.5)' },
           grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  }
});

function obtenerDatos() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);

      document.getElementById("temp").innerHTML = data.temperatura + " °C";
      document.getElementById("min").innerHTML = data.min + " °C";
      document.getElementById("max").innerHTML = data.max + " °C";

      datos.push(data.temperatura);
      var now = new Date();
      chart.data.labels.push(
        String(now.getHours()).padStart(2,'0') + ":" +
        String(now.getMinutes()).padStart(2,'0') + ":" +
        String(now.getSeconds()).padStart(2,'0')
      );

      if (datos.length > 30) {
        datos.shift();
        chart.data.labels.shift();
      }
      chart.update();

      var alerta = document.getElementById("alerta");
      alerta.innerHTML = "Estado: " + data.estado;

      if (data.estado == "ALTA") {
        alerta.style.color = "#ff3d6e";
      } else if (data.estado == "BAJA") {
        alerta.style.color = "#00b0ff";
      } else {
        alerta.style.color = "#00ff6a";
      }
    }
  };
  xhttp.open("GET", "/api/temperatura", true);
  xhttp.send();
}

setInterval(obtenerDatos, 2000);
obtenerDatos();
</script>

</body>
</html>
)rawliteral";

  return html;
}

// ============================================================
// CONEXIÓN WiFi
// ============================================================

void conectarWiFi() {
  Serial.print("📶 Conectando a WiFi: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado — IP: " + WiFi.localIP().toString());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n❌ No se pudo conectar al WiFi. Reintentando...");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================================
// CONEXIÓN MQTT
// ============================================================

void conectarMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.print("📡 Conectando a MQTT: " + String(MQTT_BROKER));

  // Usar DEVICE_ID como client ID para que sea único
  String clientId = "esp32-" + String(DEVICE_ID);

  bool conectado;
  if (strlen(MQTT_USER) > 0) {
    conectado = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    conectado = mqttClient.connect(clientId.c_str());
  }

  if (conectado) {
    Serial.println(" ✅ MQTT conectado");
  } else {
    Serial.println(" ❌ Error MQTT (código: " + String(mqttClient.state()) + ")");
    Serial.println("   Reintentando en 5 segundos...");
    delay(5000);
  }
}
