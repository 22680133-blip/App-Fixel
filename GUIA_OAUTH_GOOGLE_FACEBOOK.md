# 🔐 Guía de Autenticación Social - Google y Facebook

## 📋 Requisitos

- Códigos obtenidos en:
  - **Google Cloud Console**: https://console.cloud.google.com
  - **Facebook Developers**: https://developers.facebook.com

---

## 🔵 CONFIGURACIÓN DE GOOGLE SIGN-IN

### 1️⃣ Obtener Google Client ID

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un nuevo proyecto
3. Habilitar **Google+ API**
4. Ir a **Credenciales** → **Crear credenciales** → **OAuth 2.0 Client ID**
5. Seleccionar **Aplicación web**
6. En **Orígenes autorizados de JavaScript** agregar:
   - `http://localhost:8100` ← Ionic serve (desarrollo)
   - `http://localhost:4200` ← Angular serve (ng serve)
   - `http://localhost` ← Capacitor (app móvil)
   - `https://tudominio.com` ← Producción
7. Copiar el **Client ID**

> ⚠️ **IMPORTANTE**: Si ves el error `Error 400: origin_mismatch`, significa que el
> origen desde donde ejecutas la app NO está registrado en Google Cloud Console.
> Abre la consola del navegador (F12) para ver el origen actual y agrégalo en
> Credenciales → OAuth 2.0 → Orígenes autorizados de JavaScript.

### 2️⃣ Actualizar el componente

En **`src/app/pantalla2/pantalla2.page.ts`**, reemplaza:

```typescript
GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

Con tu Client ID real, ej:
```typescript
GOOGLE_CLIENT_ID = '509438391464-j73ns9uoh604q77ej94t287f6eh2ls24.apps.googleusercontent.com';
```

### 3️⃣ Backend: Validar Token de Google

En tu backend (Node.js/Express), instala:
```bash
npm install google-auth-library
```

Luego, crea una ruta para validar:

```javascript
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/api/auth/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // Verificar token
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    
    // Buscar o crear usuario en BD
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        googleId: sub,
        email,
        name,
        picture,
        password: null // No hay contraseña para usuarios de Google
      });
    }
    
    // Generar JWT
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
    
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ mensaje: 'Token inválido' });
  }
});
```

---

## 🔵 CONFIGURACIÓN DE FACEBOOK LOGIN

### 1️⃣ Obtener Facebook App ID

1. Ir a [Facebook Developers](https://developers.facebook.com)
2. Crear una nueva app o usar una existente
3. Agregar producto **Facebook Login**
4. En **Settings** → **Basic**, copiar el **App ID**
5. En **Settings** → **Basic**, agregar **App Domains**:
   - `localhost:4200`
   - `tudominio.com`

### 2️⃣ Actualizar el servicio

En **`src/app/services/auth-social.service.ts`**, reemplaza:

```typescript
FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';
```

Con tu App ID, ej:
```typescript
FACEBOOK_APP_ID = '987654321';
```

### 3️⃣ Backend: Validar Token de Facebook

Instala en tu backend:
```bash
npm install axios
```

Crea una ruta:

```javascript
const axios = require('axios');

router.post('/api/auth/facebook-login', async (req, res) => {
  try {
    const { accessToken, userID } = req.body;
    
    // Verificar token con Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${userID}?access_token=${accessToken}&fields=id,email,name,picture`
    );
    
    const facebookData = response.data;
    
    // Buscar o crear usuario
    let user = await User.findOne({ email: facebookData.email });
    if (!user) {
      user = await User.create({
        facebookId: facebookData.id,
        email: facebookData.email,
        name: facebookData.name,
        picture: facebookData.picture?.data?.url,
        password: null
      });
    }
    
    // Generar JWT
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
    
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ mensaje: 'Error al validar con Facebook' });
  }
});
```

---

## 🗄️ Schema de Usuario (MongoDB)

```javascript
const userSchema = new Schema({
  email: { type: String, unique: true, required: true },
  name: String,
  password: String, // null para usuarios de redes sociales
  picture: String,
  googleId: String,
  facebookId: String,
  createdAt: { type: Date, default: Date.now }
});
```

---

## ✅ Flujo Completo

```
1. Usuario hace click en botón Google/Facebook
2. Se abre diálogo de autenticación
3. Google/Facebook devuelven token
4. Angular envía token al backend
5. Backend valida token con Google/Facebook
6. Backend genera JWT y lo envía a Angular
7. Angular guarda JWT en localStorage
8. Angular navega a /dashboard
```

---

## 🔗 URLs Útiles

- Google Cloud: https://console.cloud.google.com
- Facebook Developers: https://developers.facebook.com
- Google API Docs: https://developers.google.com/identity/gsi/web
- Facebook SDK: https://developers.facebook.com/docs/facebook-login

---

## 🆘 Solución de Problemas

### Error 400: origin_mismatch (Acceso bloqueado)

Este error significa que el origen (URL) desde donde se ejecuta la app no está
registrado en Google Cloud Console.

**Pasos para solucionarlo:**

1. Abre la consola del navegador (F12) y busca el mensaje:
   `[Google Sign-In] Origen actual: "http://localhost:8100"`
2. Copia ese origen exacto
3. Ve a [Google Cloud Console](https://console.cloud.google.com) → **Credenciales** → Tu **OAuth 2.0 Client ID**
4. En **Orígenes autorizados de JavaScript**, agrega el origen que copiaste
5. Guarda y espera ~5 minutos para que se propague el cambio

**Orígenes comunes que debes registrar:**

| Origen | Cuándo |
|--------|--------|
| `http://localhost:8100` | `ionic serve` (desarrollo) |
| `http://localhost:4200` | `ng serve` (desarrollo) |
| `http://localhost` | Capacitor webview (app móvil) |
| `https://tudominio.com` | Producción |

### Google no aparece
- ✓ Verifica que Google Client ID es correcto
- ✓ Verifica que la URL está en "Authorized origins" en Google Cloud
- ✓ Abre consola (F12) y busca errores

### Token inválido
- ✓ Verifica que Google Client ID en backend y frontend coinciden
- ✓ Verifica JWT_SECRET en backend
- ✓ Verifica que el JWT no expiró

---

## ⚠️ Notas Importantes

1. **NUNCA** guardes secrets en el código frontend
2. Usa **variables de entorno** (`.env`) en el backend
3. Verifica SIEMPRE los tokens en el backend
4. Implementa **CORS** correctamente
5. Usa **HTTPS** en producción

Ejemplo `.env` del backend:
```
GOOGLE_CLIENT_ID=xxxxx
FACEBOOK_APP_ID=xxxxx
JWT_SECRET=tu_secret_seguro
MONGODB_URI=mongodb+srv://...
```
