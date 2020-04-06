import useEventCallback from '@restart/hooks/useEventCallback';
import useStateAsync from '@restart/hooks/useStateAsync';
import useTimeout from '@restart/hooks/useTimeout';
import { useCallback, useEffect } from 'react';

import LocalTokenStorage, {
  TokenResponse,
  TokenStorage,
} from './LocalTokenStorage';

export interface UseAuthTokenOptions {
  /**
   * Time, in milliseconds, to run expired token callback ahead of the
   * actual token expiration
   */
  leeway?: number;

  /** A persistent store for the token, defaults to local storage and fallback to session */
  tokenStorage?: TokenStorage;

  /** A callback fired when the token response is about to expire */
  onTokenExpired?(token: TokenResponse): void;
}

const localTokenStorage = new LocalTokenStorage();

export default function useAuthToken<
  TTokenResponse extends TokenResponse = TokenResponse
>({
  onTokenExpired,
  leeway = 0,
  tokenStorage = localTokenStorage,
}: UseAuthTokenOptions) {
  const timeout = useTimeout();

  const [
    tokenResponse,
    setTokenResponse,
  ] = useStateAsync<TTokenResponse | null>(() => {
    const initialTokenResponse = tokenStorage.load() as TTokenResponse | null;
    if (initialTokenResponse && initialTokenResponse.expiresAt < Date.now()) {
      tokenStorage.clear();
      return null;
    }

    return initialTokenResponse;
  });

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
      return setTokenResponse(nextTokenResponse);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenStorage],
  );

  return (
    [tokenResponse, updateTokenResponse] as
    [TTokenResponse | null, typeof updateTokenResponse]
  );
}
