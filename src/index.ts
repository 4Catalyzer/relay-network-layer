/* eslint-disable import/no-duplicates, import/order */
import LocalTokenStorage from './LocalTokenStorage';
import NetworkLayer from './NetworkLayer';
import createFetch from './createFetch';
import createSubscribe, {
  SocketIoSubscriptionClient,
} from './createSubscribe';
import useAuthToken from './useAuthToken';

// FIXME: These should be type imports.
import { TokenResponse, TokenStorage } from './LocalTokenStorage';
import { Network } from './NetworkLayer';
import { FetchOptions } from './createFetch';
import {
  SubscriptionClient,
  SubscriptionClientOptions,
  SubscriptionOptions,
} from './createSubscribe';
import { UseAuthTokenOptions } from './useAuthToken';
/* eslint-enable import/no-duplicates, import/order */

export default NetworkLayer;

export {
  LocalTokenStorage,
  SocketIoSubscriptionClient,
  createFetch,
  createSubscribe,
  useAuthToken,
};

// FIXME: These should be type exports.
export {
  FetchOptions,
  Network,
  SubscriptionClient,
  SubscriptionClientOptions,
  SubscriptionOptions,
  TokenResponse,
  TokenStorage,
  UseAuthTokenOptions,
};
