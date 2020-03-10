/* eslint-disable import/no-duplicates, import/order */
import LocalTokenStorage from './LocalTokenStorage';
import NetworkLayer from './NetworkLayer';
import createFetch from './createFetch';
import createSubscribe, {
  SocketIoSubscriptionClient,
} from './createSubscribe';
import useAuthToken from './useAuthToken';

// FIXME: These should use import type.
import {
  TokenResponse as TokenResponseT,
  TokenStorage as TokenStorageT,
} from './LocalTokenStorage';
import { Network as NetworkT } from './NetworkLayer';
import { FetchOptions as FetchOptionsT } from './createFetch';
import {
  SubscriptionClientOptions as SubscriptionClientOptionsT,
  SubscriptionClient as SubscriptionClientT,
  SubscriptionOptions as SubscriptionOptionsT,
} from './createSubscribe';
import { UseAuthTokenOptions as UseAuthTokenOptionsT } from './useAuthToken';
/* eslint-enable import/no-duplicates, import/order */

export default NetworkLayer;

export {
  LocalTokenStorage,
  SocketIoSubscriptionClient,
  createFetch,
  createSubscribe,
  useAuthToken,
};

// FIXME: These should use export type.
export type FetchOptions = FetchOptionsT;
export type Network = NetworkT;
export type SubscriptionClient = SubscriptionClientT;
export type SubscriptionClientOptions = SubscriptionClientOptionsT;
export type SubscriptionOptions<
  TSubscriptionClient extends SubscriptionClientT
> = SubscriptionOptionsT<TSubscriptionClient>;
export type TokenResponse = TokenResponseT;
export type TokenStorage = TokenStorageT;
export type UseAuthTokenOptions = UseAuthTokenOptionsT;
