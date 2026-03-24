# Arquitectura — App-Fixel

```
ESP32  →  MQTT/HTTP  →  Backend  →  PostgreSQL
                           ↓
                       API REST
                           ↓
                       App Ionic
```

## Componentes

### 1. ESP32 (Firmware)

Microcontrolador con sensor **DHT11** que lee temperatura y humedad cada 5 segundos.

| Canal | Descripción |
|-------|-------------|
| **MQTT** | Publica JSON al tópico `fixel/{DEVICE_ID}/data` cada 10 s |
| **HTTP POST** | Fallback: `POST {BACKEND_URL}/api/ingest/{DEVICE_ID}` cuando MQTT no está disponible |
| **HTTP Local** | Servidor en `http://{IP}/api/temperatura` para pruebas directas |

**Payload JSON:**
```json
{
  "temperatura": 5.2,
  "humedad": 65.0,
  "compresor": true,
  "energia": "Normal"
}
```

Archivos: [`firmware/esp32_fixel/esp32_fixel.ino`](firmware/esp32_fixel/esp32_fixel.ino)

---

### 2. Backend (Node.js + Express)

Recibe datos del ESP32 por dos canales y los almacena en PostgreSQL.

#### Ingesta de datos (ESP32 → Backend)

| Canal | Ruta / Tópico | Autenticación |
|-------|---------------|---------------|
| MQTT | `fixel/+/data` (suscripción wildcard) | Credenciales del broker |
| HTTP | `POST /api/ingest/:deviceCode` | Código único del dispositivo |

#### API REST (Backend → App Ionic)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Registro |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/google-login` | — | OAuth Google |
| GET | `/api/auth/me` | JWT | Perfil del usuario |
| PUT | `/api/auth/profile` | JWT | Actualizar perfil |
| PUT | `/api/auth/password` | JWT | Cambiar contraseña |
| GET | `/api/devices` | JWT | Listar dispositivos |
| POST | `/api/devices` | JWT | Crear dispositivo |
| PUT | `/api/devices/:id` | JWT | Actualizar dispositivo |
| DELETE | `/api/devices/:id` | JWT | Eliminar dispositivo |
| GET | `/api/readings/latest/:id` | JWT | Última lectura |
| GET | `/api/readings/history/:id` | JWT | Historial 24 h |

Archivos: [`backend/`](backend/)

---

### 3. PostgreSQL

Base de datos relacional con tres tablas principales:

```
users  1───*  devices  1───*  readings
```

| Tabla | Columnas clave |
|-------|----------------|
| `users` | id, nombre, email, password_hash, googleId, picture |
| `devices` | id, user_id, device_code, device_id, nombre, limite_min, limite_max, status |
| `readings` | id, device_id, temperatura, humedad, compresor, energia, timestamp |

ORM: **Sequelize** con sincronización automática de esquema.

---

### 4. App Ionic (Angular)

Aplicación móvil/web que consume la API REST del backend.

| Página | Función |
|--------|---------|
| `pantalla2` | Login / Registro (email + OAuth) |
| `pantalla3` | Selección de dispositivo |
| `dashboard` | Monitoreo en tiempo real (polling 15 s) + gráfica Chart.js |
| `configuracion` | Ajustes del dispositivo (límites, alertas) |
| `perfil` | Perfil del usuario |

**Flujo de datos en Dashboard:**
1. `DeviceService.getUltimaLectura(id)` → `GET /api/readings/latest/:id`
2. `DeviceService.getHistorial(id)` → `GET /api/readings/history/:id`
3. Polling cada 15 segundos actualiza temperatura, estado y gráfica.

Archivos: [`src/app/`](src/app/)

---

## Flujo completo

```
┌─────────────┐      MQTT (cada 10s)       ┌──────────────┐
│             │ ──────────────────────────→ │              │
│   ESP32     │                             │   Backend    │
│   DHT11     │  HTTP POST (fallback)       │   Express    │
│             │ ──────────────────────────→ │              │
└─────────────┘                             └──────┬───────┘
                                                   │ Sequelize
                                                   ▼
                                            ┌──────────────┐
                                            │  PostgreSQL   │
                                            │  (readings)   │
                                            └──────┬───────┘
                                                   │ SQL queries
                                                   ▼
                                            ┌──────────────┐
                                            │  API REST     │
                                            │  /api/*       │
                                            └──────┬───────┘
                                                   │ HTTP + JWT
                                                   ▼
                                            ┌──────────────┐
                                            │  App Ionic    │
                                            │  (Angular)    │
                                            └──────────────┘
```

## Configuración

Copia `backend/.env.example` a `backend/.env` y configura:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `JWT_SECRET` | Clave secreta para tokens JWT |
| `MQTT_BROKER_URL` | URL del broker MQTT (opcional) |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | Credenciales del broker |
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth de Google |

En el firmware del ESP32, configura `MQTT_BROKER`, `WIFI_SSID`, `WIFI_PASSWORD`, `DEVICE_ID` y opcionalmente `BACKEND_URL` para el fallback HTTP.
