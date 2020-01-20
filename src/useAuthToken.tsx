import { useCallback, useEffect, useMemo } from 'react';
import useEventCallback from '@restart/hooks/useEventCallback';
import useStateAsync from '@restart/hooks/useStateAsync';
import useTimeout from '@restart/hooks/useTimeout';

import LocalTokenStorage, {
  TokenResponse,
  TokenStorage,
} from './LocalTokenStorage';

const MAX_DELAY_MS = 2 ** 31 - 1;

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

/*
 * Browsers including Internet Explorer, Chrome, Safari, and Firefox store the
 * delay as a 32-bit signed integer internally. This causes an integer overflow
 * when using delays larger than 2,147,483,647 ms (about 24.8 days),
 * resulting in the timeout being executed immediately.
 *
 * via: https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout
 */
function useSafeTimeout() {
  const timeout = useTimeout();
  return useMemo(() => {
    function set(fn: () => void, ms = 0): void {
      if (ms > MAX_DELAY_MS) {
        const leftMs = ms - MAX_DELAY_MS;
        timeout.set(() => set(fn, leftMs), MAX_DELAY_MS);
        return;
      }
      timeout.set(fn, ms);
    }

    return {
      ...timeout,
      set,
    };
  }, [timeout]);
}

export default function useAuthToken<
  TTokenResponse extends TokenResponse = TokenResponse
>({
  onTokenExpired,
  leeway = 0,
  tokenStorage = localTokenStorage,
}: UseAuthTokenOptions) {
  const timeout = useSafeTimeout();

  const [
    tokenResponse,
    setTokenResponse,
  ] = useStateAsync<TTokenResponse | null>(
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
      return setTokenResponse(nextTokenResponse);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenStorage],
  );

  return [tokenResponse, updateTokenResponse] as [
    TTokenResponse,
    typeof updateTokenResponse,
  ];
}
