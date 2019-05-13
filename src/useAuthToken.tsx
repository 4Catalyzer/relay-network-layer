import { useState, useEffect, useCallback } from 'react';
import useTimeout from '@restart/hooks/useTimeout';
import useEventCallback from '@restart/hooks/useEventCallback';

import LocalTokenStorage, {
  TokenStorage,
  TokenResponse,
} from './localTokenStorage';

export interface TokenOptions {
  leeway?: number;
  tokenStorage?: TokenStorage;
  onTokenExpired?(token: TokenResponse): void;
}

const localTokenStorage = new LocalTokenStorage();

export default function useAuthToken<
  TTokenResponse extends TokenResponse = TokenResponse
>({
  onTokenExpired,
  leeway = 0,
  tokenStorage = localTokenStorage,
}: TokenOptions) {
  const timeout = useTimeout();

  const [tokenResponse, setTokenResponse] = useState<TTokenResponse | null>(
    () => tokenStorage.load() as TTokenResponse,
  );

  const scheduleExpireTokenResponse = useEventCallback(
    (nextTokenResponse: TokenResponse) => {
      timeout.set(
        () => onTokenExpired && onTokenExpired(nextTokenResponse),
        Math.max(nextTokenResponse.expiresAt - Date.now() - leeway, 0),
      );
    },
  );

  useEffect(() => {
    if (tokenResponse) scheduleExpireTokenResponse(tokenResponse);
  }, [scheduleExpireTokenResponse, tokenResponse]);

  const updateTokenResponse = useCallback(
    (nextTokenResponse: TTokenResponse | null) => {
      timeout.clear();
      if (nextTokenResponse) {
        tokenStorage.save(nextTokenResponse);
      } else {
        tokenStorage.clear();
      }
      setTokenResponse(nextTokenResponse);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenStorage],
  );

  return [tokenResponse, updateTokenResponse];
}
