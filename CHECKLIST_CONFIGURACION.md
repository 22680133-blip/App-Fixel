# ⚡ CHECKLIST: PASOS PARA HABILITAR GOOGLE Y FACEBOOK LOGIN

## ✅ Paso 1: Obtener IDs de Aplicación

### Google
- [ ] Ir a https://console.cloud.google.com
- [ ] Crear nuevo proyecto
- [ ] Habilitar Google+ API
- [ ] Crear credenciales OAuth 2.0 (Aplicación Web)
- [ ] Agregar orígenes autorizados de JavaScript:
  - `http://localhost:8100` (Ionic serve)
  - `http://localhost:4200` (ng serve)
  - `http://localhost` (Capacitor)
  - `https://tudominio.com` (Producción)
- [ ] Copiar tu **Google Client ID** (termina con `.apps.googleusercontent.com`)

### Facebook
- [ ] Ir a https://developers.facebook.com
- [ ] Crear app o usar existente
- [ ] Agregar producto "Facebook Login"
- [ ] Copiar tu **App ID**
- [ ] Agregar `localhost` al App Domains

---

## ✅ Paso 2: Configurar Frontend

### Archivo: `src/app/pantalla2/pantalla2.page.ts`
Reemplaza en línea ~13:
```typescript
// CAMBIA ESTO:
GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// CON ESTO (tu cliente ID real):
GOOGLE_CLIENT_ID = '509438391464-j73ns9uoh604q77ej94t287f6eh2ls24.apps.googleusercontent.com';
```

### Archivo: `src/app/services/auth-social.service.ts`
Reemplaza en línea ~18-19:
```typescript
// CAMBIA ESTO:
GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';

// CON ESTO (tus IDs reales):
GOOGLE_CLIENT_ID = '509438391464-j73ns9uoh604q77ej94t287f6eh2ls24.apps.googleusercontent.com';
FACEBOOK_APP_ID = '987654321';
```

---

## ✅ Paso 3: Configurar Backend

Copia el contenido de `BACKEND_AUTH_EXAMPLE.js` y adaptalo a tu backend.

### Variables de entorno (`.env`):
```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
JWT_SECRET=tu_secreto_seguro_aqui
MONGODB_URI=tu_mongodb_uri
```

### Instala dependencias del backend:
```bash
npm install google-auth-library axios
```

---

## ✅ Paso 4: Probar

1. Ejecuta el frontend: `ng serve`
2. Ejecuta el backend: `npm start`
3. Abre http://localhost:4200
4. Haz click en los botones de Google o Facebook
5. Deberías ver los diálogos de autenticación

---

## 🔧 URL de Backend

Cambia `TU_IP_LOCAL` en estos archivos:

### `src/app/pantalla2/pantalla2.page.ts` (línea ~10)
```typescript
API_URL = 'http://TU_IP_LOCAL:3000/api/auth';
// Cambia a:
API_URL = 'http://192.168.x.x:3000/api/auth'; // Tu IP local o URL
```

### `src/app/services/auth-social.service.ts` (línea ~8)
```typescript
API_URL = 'http://TU_IP_LOCAL:3000/api/auth';
// Cambia a:
API_URL = 'http://192.168.x.x:3000/api/auth'; // Tu IP local o URL
```

---

## 📁 Archivos Creados/Modificados

✅ **Modificados:**
- `src/app/pantalla2/pantalla2.page.ts` - Lógica de login social
- `src/app/pantalla2/pantalla2.page.html` - Botones de login social
- `src/app/pantalla2/pantalla2.page.scss` - Estilos de botones circulares

✅ **Creados:**
- `src/app/services/auth-social.service.ts` - Servicio de autenticación
- `GUIA_OAUTH_GOOGLE_FACEBOOK.md` - Guía completa
- `BACKEND_AUTH_EXAMPLE.js` - Ejemplo de backend

---

## ⚠️ Importante

1. **NUNCA** commits los IDs reales a GitHub
2. Verifica siempre los tokens en el **backend**, nunca solo en frontend
3. Usa **HTTPS** en producción
4. Implementa **CORS** en tu backend:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:4200', 'https://tudominio.com'],
  credentials: true
}));
```

---

## 🆘 Problemas Comunes

### Error 400: origin_mismatch (Acceso bloqueado)
- ✓ Abre la consola del navegador (F12) y busca: `[Google Sign-In] Origen actual: "..."`
- ✓ Copia ese origen y agrégalo en Google Cloud Console → Credenciales → OAuth 2.0 → **Orígenes autorizados de JavaScript**
- ✓ Recuerda agregar `http://localhost:8100` si usas `ionic serve`
- ✓ Espera ~5 minutos para que se propague el cambio

### Google no aparece
- ✓ Verifica que Google Client ID es correcto
- ✓ Verifica que la URL está en "Authorized origins" en Google Cloud
- ✓ Abre consola (F12) y busca errores

### Facebook no funciona
- ✓ Verifica App ID es correcto
- ✓ Verifica que el email está habilitado en permisos
- ✓ Verifica dominio en App Domains

### Error 404 en backend
- ✓ Verifica que backend está corriendo
- ✓ Verifica `API_URL` es correcta (IP y puerto)
- ✓ Verifica CORS está habilitado en backend

### Token inválido
- ✓ Verifica Google Client ID en backend y frontend coinciden
- ✓ Verifica JWT_SECRET en backend
- ✓ Verifica JWT no expiró

---

## 📞 Documentación Oficial

- Google Sign-In: https://developers.google.com/identity/gsi/web
- Facebook Login: https://developers.facebook.com/docs/facebook-login/web
- JWT: https://jwt.io
