# Archivos para Railway (backend-monitoreo)

Estos archivos agregan los endpoints `/api/devices`, `/api/auth/profile` y
`/api/auth/password` al backend-monitoreo desplegado en Railway.
**No tocan la autenticación existente (login/register).**

## Archivos a copiar

Copia estos archivos a tu repositorio `backend-monitoreo`:

| Archivo de aquí                             | Copiar a (en backend-monitoreo)               | Acción        |
| ------------------------------------------- | ---------------------------------------------- | ------------- |
| `src/app.js`                                | `src/app.js`                                   | **Reemplazar** |
| `src/middleware/auth.js`                     | `src/middleware/auth.js`                        | **Crear**     |
| `src/controllers/device.controller.js`      | `src/controllers/device.controller.js`          | **Crear**     |
| `src/controllers/profile.controller.js`     | `src/controllers/profile.controller.js`         | **Crear**     |
| `src/routes/devices.js`                     | `src/routes/devices.js`                         | **Reemplazar** |
| `src/routes/profile.js`                     | `src/routes/profile.js`                         | **Crear**     |

## SQL — Agregar columnas para perfil

Ejecuta este SQL en tu base de datos de Railway **antes** de desplegar:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ubicacion VARCHAR DEFAULT NULL;
```

## Pasos

1. Ejecuta el SQL de arriba en tu PostgreSQL de Railway
2. Copia los 6 archivos a tu repo `backend-monitoreo`
3. Haz commit y push:
   ```bash
   git add .
   git commit -m "feat: agregar endpoints de dispositivos y perfil"
   git push
   ```
4. Railway redespliega automáticamente

## Qué hace cada archivo

- **`src/middleware/auth.js`** — Middleware JWT que valida el token Bearer
  y agrega `req.userId` al request. Compatible con los tokens de auth.controller.js.

- **`src/controllers/device.controller.js`** — CRUD completo de dispositivos:
  - `GET /api/devices` → Lista los dispositivos del usuario
  - `GET /api/devices/:id` → Obtiene un dispositivo
  - `POST /api/devices` → Crea un dispositivo (auto-genera código "FRIDGE-XXXX")
  - `PUT /api/devices/:id` → Actualiza nombre, ubicación, límites
  - `DELETE /api/devices/:id` → Elimina un dispositivo

- **`src/controllers/profile.controller.js`** — Gestión de perfil:
  - `PUT /api/auth/profile` → Actualiza nombre, teléfono, ubicación, picture
  - `PUT /api/auth/password` → Cambia contraseña (requiere contraseña actual)

- **`src/routes/devices.js`** — Define las rutas de dispositivos y aplica el middleware auth.

- **`src/routes/profile.js`** — Define las rutas de perfil y aplica el middleware auth.

- **`src/app.js`** — Versión actualizada que monta las rutas de dispositivos
  y perfil junto con las de autenticación existentes.

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

## Columnas de la tabla users (nuevas)

```
telefono      VARCHAR DEFAULT NULL
ubicacion     VARCHAR DEFAULT NULL
```

## Mapeo DB → JSON (respuesta al frontend)

### Dispositivos

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

### Usuario (perfil)

| Columna DB     | Campo JSON   |
| -------------- | ------------ |
| `id`           | `id`         |
| `nombre`       | `nombre`     |
| `email`        | `email`      |
| `picture`      | `picture`    |
| `telefono`     | `telefono`   |
| `ubicacion`    | `ubicacion`  |
