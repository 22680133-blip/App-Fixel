# Archivos para Railway (backend-monitoreo)

Estos archivos agregan el endpoint `/api/devices` al backend-monitoreo
desplegado en Railway. **No tocan la autenticación.**

## Archivos a copiar

Copia estos archivos a tu repositorio `backend-monitoreo`:

| Archivo de aquí                        | Copiar a (en backend-monitoreo)          | Acción        |
| -------------------------------------- | ---------------------------------------- | ------------- |
| `src/app.js`                           | `src/app.js`                             | **Reemplazar** |
| `src/middleware/auth.js`               | `src/middleware/auth.js`                 | **Crear**     |
| `src/controllers/device.controller.js` | `src/controllers/device.controller.js`   | **Crear**     |
| `src/routes/devices.js`               | `src/routes/devices.js`                  | **Reemplazar** |

## Pasos

1. Copia los 4 archivos a tu repo `backend-monitoreo`
2. Haz commit y push:
   ```bash
   git add .
   git commit -m "feat: agregar endpoint de dispositivos"
   git push
   ```
3. Railway redespliega automáticamente

## Qué hace cada archivo

- **`src/middleware/auth.js`** — Middleware JWT que valida el token Bearer
  y agrega `req.userId` al request. Compatible con los tokens de auth.controller.js.

- **`src/controllers/device.controller.js`** — CRUD completo de dispositivos:
  - `GET /api/devices` → Lista los dispositivos del usuario
  - `GET /api/devices/:id` → Obtiene un dispositivo
  - `POST /api/devices` → Crea un dispositivo (auto-genera código "FRIDGE-XXXX")
  - `PUT /api/devices/:id` → Actualiza nombre, ubicación, límites
  - `DELETE /api/devices/:id` → Elimina un dispositivo

- **`src/routes/devices.js`** — Define las rutas y aplica el middleware auth.

- **`src/app.js`** — Versión actualizada que monta las rutas de dispositivos
  junto con las de autenticación existentes.

## Columnas de la tabla devices

```
id            SERIAL PRIMARY KEY
user_id       INTEGER REFERENCES users(id)
nombre        VARCHAR
ubicacion     VARCHAR
limite_min    FLOAT DEFAULT 2
limite_max    FLOAT DEFAULT 8
created_at    TIMESTAMP DEFAULT NOW()
status        VARCHAR DEFAULT 'desconectado'
device_code   VARCHAR UNIQUE
device_id     VARCHAR
```

## Mapeo DB → JSON (respuesta al frontend)

| Columna DB     | Campo JSON  |
| -------------- | ----------- |
| `id`           | `id`        |
| `device_code`  | `deviceId`  |
| `nombre`       | `nombre`    |
| `ubicacion`    | `ubicacion` |
| `limite_min`   | `limiteMin` |
| `limite_max`   | `limiteMax` |
| `status`       | `status`    |
| `created_at`   | `createdAt` |
