import createFetch, { FetchOptions } from './createFetch';
import createSubscribe, { SubscriptionOptions } from './createSubscribe';
import LocalTokenStorage, {
  TokenResponse,
  TokenStorage,
} from './LocalTokenStorage';
import NetworkLayer, { Network } from './NetworkLayer';
import useAuthToken, { UseAuthTokenOptions } from './useAuthToken';

export default NetworkLayer;
export {
  createFetch,
  createSubscribe,
  useAuthToken,
  UseAuthTokenOptions,
  LocalTokenStorage,
  TokenResponse,
  TokenStorage,
  Network,
  FetchOptions,
  SubscriptionOptions,
};
