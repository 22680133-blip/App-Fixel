import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

declare var FB: any; // Facebook SDK
declare global {
  interface Window {
    fbAsyncInit: () => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthSocialService {
  GOOGLE_CLIENT_ID = environment.googleClientId;
  FACEBOOK_APP_ID = environment.facebookAppId;

  constructor() {
    this.initFacebookSDK();
  }

  /**
   * 🔵 FACEBOOK LOGIN
   */
  loginWithFacebook(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!FB) {
        reject('Facebook SDK no cargado');
        return;
      }

      FB.login((response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          const userID = response.authResponse.userID;
          
          // Retornar los datos, el componente se encargará de enviarlos al backend
          resolve({
            accessToken,
            userID
          });
        } else {
          reject('Cancelado por el usuario');
        }
      }, { scope: 'public_profile,email' });
    });
  }

  /**
   * Inicializar Facebook SDK
   */
  private initFacebookSDK() {
    if (document.getElementById('facebook-jssdk')) {
      return; // Ya está cargado
    }

    window.fbAsyncInit = () => {
      FB.init({
        appId: this.FACEBOOK_APP_ID,
        xfbml: true,
        version: 'v18.0'
      });
    };

    // Cargar el SDK
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v18.0&appId=' + this.FACEBOOK_APP_ID;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }

  /**
   * Decodificar JWT token de Google (sin verificación de firma)
   * El backend debe verificar la firma correctamente
   */
  decodeToken(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
}
