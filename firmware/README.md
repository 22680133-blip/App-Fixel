# 🔌 ESP32 Firmware — App-Fixel Monitor de Refrigerador

Firmware para el ESP32 que lee la temperatura con un sensor DHT11, evalúa el estado (NORMAL/ALTA/BAJA), controla un buzzer de alerta, y envía los datos al backend de App-Fixel vía MQTT.

## 📋 Requisitos

### Hardware
| Componente | Descripción |
|-----------|------------|
| ESP32 DevKit V1 | Microcontrolador con WiFi |
| DHT11 | Sensor de temperatura y humedad |
| Buzzer activo | Para alertas sonoras |
| Resistencia 10kΩ | Pull-up para el DHT11 |
| Protoboard + cables | Para conexiones |

### Diagrama de conexiones

```
ESP32 DevKit V1
┌──────────────┐
│              │
│  GPIO 4  ────┼──── DHT11 DATA (con resistencia 10kΩ a 3.3V)
│  GPIO 5  ────┼──── Buzzer (+)
│  GPIO 2  ────┼──── LED indicador (integrado)
│  3.3V    ────┼──── DHT11 VCC + Resistencia 10kΩ
│  GND     ────┼──── DHT11 GND + Buzzer (-)
│              │
└──────────────┘

DHT11 pinout:       Buzzer:
┌─────┐            ┌─────┐
│ VCC │ → 3.3V     │  +  │ → GPIO 5
│ DATA│ → GPIO 4   │  -  │ → GND
│ NC  │            └─────┘
│ GND │ → GND
└─────┘
```

### Software (Arduino IDE)

1. **Arduino IDE** 2.x o posterior
2. **ESP32 Board Package**: En Preferences → Additional Boards Manager URLs agregar:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. En Board Manager instalar **"esp32"** by Espressif Systems

### Librerías (instalar desde Arduino IDE → Sketch → Include Library → Manage Libraries)

| Librería | Autor | Versión |
|----------|-------|---------|
| DHT sensor library | Adafruit | ≥ 1.4.0 |
| Adafruit Unified Sensor | Adafruit | ≥ 1.1.0 |
| PubSubClient | Nick O'Leary | ≥ 2.8 |
| ArduinoJson | Benoit Blanchon | ≥ 7.0.0 |

## 🚀 Configuración paso a paso

### Paso 1: Registrar el dispositivo en la app

Antes de programar el ESP32, necesitas crear un dispositivo en la app:

1. Abre la app App-Fixel e inicia sesión
2. Ve a la pantalla de configuración de dispositivo
3. Registra un nuevo dispositivo (nombre, ubicación, límites de temperatura)
4. La app generará un **Device ID** (ej: `FRIDGE-A1B2`)
5. **Anota este ID** — lo necesitarás para el firmware

### Paso 2: Configurar el broker MQTT

Puedes usar un broker MQTT gratuito o uno propio:

#### Opción A: HiveMQ Cloud (recomendado para empezar)
1. Ve a [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
2. Crea una cuenta gratuita (100 conexiones gratis)
3. Crea un cluster y anota:
   - **URL del broker**: `xxxxxxxx.s1.eu.hivemq.cloud`
   - **Puerto**: `8883` (TLS) o `1883` (sin TLS)
   - **Usuario y contraseña** del cluster

#### Opción B: Broker público (solo para pruebas)
```
Broker: broker.hivemq.com
Puerto: 1883
Usuario: (vacío)
Password: (vacío)
```
> ⚠️ No usar en producción — los datos son públicos

#### Opción C: Mosquitto local
```bash
# Instalar en Ubuntu/Debian
sudo apt install mosquitto mosquitto-clients

# Probar
mosquitto_sub -t "fixel/+/data" -v
```

### Paso 3: Configurar el firmware del ESP32

Abre el archivo `esp32_fixel.ino` y modifica las siguientes constantes:

```cpp
// WiFi — Tu red WiFi
const char* WIFI_SSID     = "MiRedWiFi";
const char* WIFI_PASSWORD  = "MiPassword123";

// MQTT — Datos de tu broker
const char* MQTT_BROKER   = "broker.hivemq.com";  // o tu URL de HiveMQ Cloud
const int   MQTT_PORT     = 1883;                  // 8883 para TLS
const char* MQTT_USER     = "";                    // Usuario si aplica
const char* MQTT_PASS     = "";                    // Password si aplica

// Device ID — El que generó la app en Paso 1
const char* DEVICE_ID     = "FRIDGE-A1B2";

// Límites de temperatura (también se pueden cambiar desde la app)
float LIMITE_MIN = 2.0;   // Temperatura mínima (°C)
float LIMITE_MAX = 8.0;   // Temperatura máxima (°C)
```

### Paso 4: Configurar el backend

En el archivo `backend/.env` (o las variables de entorno en Railway), configura:

```env
# Mismos datos del broker MQTT que usaste en el ESP32
MQTT_BROKER_URL=mqtt://broker.hivemq.com
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC_PREFIX=fixel
```

### Paso 5: Subir el firmware al ESP32

1. Conecta el ESP32 por USB
2. En Arduino IDE selecciona:
   - **Board**: "ESP32 Dev Module"
   - **Port**: El puerto COM/USB del ESP32
   - **Upload Speed**: 921600
3. Click en **Upload** (→)
4. Abre el **Serial Monitor** (115200 baud) para ver los logs

### Paso 6: Verificar que funciona

En el Serial Monitor deberías ver:

```
========================================
  App-Fixel — ESP32 Monitor de Refrigerador
========================================
✅ Sensor DHT11 inicializado en GPIO 4
📡 Tópico MQTT: fixel/FRIDGE-A1B2/data
📶 Conectando a WiFi: MiRedWiFi....
✅ WiFi conectado — IP: 192.168.1.100
🌐 Servidor HTTP en http://192.168.1.100
📡 Conectando a MQTT: broker.hivemq.com ✅ MQTT conectado
✅ Sistema listo

🌡️  Temp: 5.2°C | 💧 Hum: 65.0% | Estado: NORMAL | Min: 5.2 | Max: 5.2
📤 MQTT publicado: {"temperatura":5.2,"humedad":65.0,"compresor":true,"energia":"Normal"}
```

## 🌐 Endpoints HTTP locales (para pruebas)

Mientras el ESP32 esté en tu misma red WiFi, puedes acceder a:

| Endpoint | Descripción |
|----------|------------|
| `http://{IP}/` | Dashboard web local con gráfica en tiempo real |
| `http://{IP}/api/temperatura` | Datos de temperatura en JSON |
| `http://{IP}/api/status` | Estado del sistema (WiFi, MQTT, sensor) |
| `http://{IP}/api/reset` | Reiniciar temperaturas mín/máx registradas |

### Ejemplo de respuesta de `/api/temperatura`:
```json
{
  "temperatura": 5.2,
  "humedad": 65.0,
  "min": 3.1,
  "max": 7.8,
  "estado": "NORMAL",
  "compresor": true,
  "energia": "Normal",
  "deviceId": "FRIDGE-A1B2"
}
```

## 📊 Flujo de datos completo

```
                         ┌──────────────┐
                         │   DHT11      │
                         │   Sensor     │
                         └──────┬───────┘
                                │ temperatura, humedad
                                ▼
                         ┌──────────────┐
                         │   ESP32      │
                         │  Firmware    │
                         │              │
                         │ • Evalúa     │ ──► Buzzer 🔔
                         │   estado     │     (ALTA/BAJA)
                         │ • Calcula    │
                         │   min/max    │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
            ┌────────────┐ ┌────────┐ ┌──────────┐
            │ MQTT Broker│ │ HTTP   │ │ Serial   │
            │            │ │ Local  │ │ Monitor  │
            └─────┬──────┘ └────────┘ └──────────┘
                  │
                  ▼
            ┌────────────┐
            │ Backend    │
            │ Node.js    │
            │ (Railway)  │
            └─────┬──────┘
                  │
                  ▼
            ┌────────────┐
            │ PostgreSQL │
            │ (Railway)  │
            └─────┬──────┘
                  │
                  ▼
            ┌────────────┐
            │ App Ionic  │
            │ Dashboard  │
            │ 📱         │
            └────────────┘
```

## 🔧 Solución de problemas

### El sensor no lee datos
- Verifica que el DHT11 esté conectado al GPIO correcto (default: GPIO 4)
- Asegúrate de tener la resistencia pull-up de 10kΩ entre DATA y VCC
- Espera al menos 2 segundos después de encender (el DHT11 necesita calentarse)

### No conecta al WiFi
- Verifica SSID y contraseña (distingue mayúsculas/minúsculas)
- El ESP32 solo soporta WiFi 2.4GHz (no 5GHz)
- Acerca el ESP32 al router

### No conecta al broker MQTT
- Verifica URL y puerto del broker
- Si usas TLS (puerto 8883), necesitas certificados
- Si usas HiveMQ Cloud, asegúrate de crear credenciales en el panel
- Códigos de error PubSubClient:
  - `-2`: Network failed
  - `-1`: Connection refused
  - `4`: Bad credentials
  - `5`: Not authorized

### Los datos no aparecen en la app
1. Verifica en el Serial Monitor que MQTT publique sin errores
2. Verifica que el `DEVICE_ID` del ESP32 coincida con el registrado en la app
3. Revisa que el backend tenga las variables `MQTT_*` configuradas
4. Verifica que el backend esté suscrito al tópico correcto

### El buzzer suena constantemente
- Revisa los límites de temperatura (`LIMITE_MIN` y `LIMITE_MAX`)
- Los límites del firmware y la app deben coincidir
- La temperatura del ambiente puede activar el buzzer; coloca el sensor dentro del refrigerador

## 📝 Personalización

### Cambiar pines GPIO

En el archivo `.ino`, modifica:
```cpp
#define DHT_PIN    4    // Pin del sensor
#define BUZZER_PIN 5    // Pin del buzzer
#define LED_PIN    2    // Pin del LED
```

### Cambiar frecuencia de lectura

```cpp
const unsigned long INTERVALO_LECTURA = 5000;   // Leer sensor cada 5s
const unsigned long INTERVALO_MQTT    = 10000;  // Publicar MQTT cada 10s
```

### Usar sensor DHT22 en lugar de DHT11

```cpp
#define DHT_TYPE   DHT22  // Cambiar de DHT11 a DHT22
```
El DHT22 tiene mayor rango (-40 a 80°C) y mejor precisión (±0.5°C vs ±2°C del DHT11).

## 📄 Licencia

Este firmware es parte del proyecto App-Fixel. Uso libre para fines educativos y personales.
