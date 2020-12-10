// @ts-ignore IDK why this isn't working now
import store from 'store/dist/store.modern';

const TOKEN_KEY = 'relay-auth-provider:token';

export interface TokenResponse {
  /**
   * token expiration deadline in milliseconds
   */
  expiresAt: number;
}

export interface TokenStorage {
  load(): TokenResponse | null;
  save(token: TokenResponse): void;
  clear(): void;
}

export default class LocalTokenStorage implements TokenStorage {
  constructor(readonly key: string = TOKEN_KEY) {}

  load(): TokenResponse | null {
    const tokenResponse: TokenResponse | null = store.get(this.key, null);

    if (!tokenResponse || Date.now() > tokenResponse.expiresAt) {
      this.clear();
      return null;
    }

    return tokenResponse;
  }

  save(token: TokenResponse) {
    store.set(this.key, token);
  }

  clear() {
    store.remove(this.key);
  }
}
