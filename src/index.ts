/* eslint-disable import/no-duplicates, import/order */
import LocalTokenStorage from './LocalTokenStorage';
import NetworkLayer from './NetworkLayer';
import createFetch from './createFetch';
import createSubscribe from './createSubscribe';
import useAuthToken from './useAuthToken';

// FIXME: These should be type imports.
import { TokenResponse, TokenStorage } from './LocalTokenStorage';
import { Network } from './NetworkLayer';
import { FetchOptions } from './createFetch';
import {
  SubscriptionClientOptions,
  SubscriptionOptions,
} from './createSubscribe';
import { UseAuthTokenOptions } from './useAuthToken';
/* eslint-enable import/no-duplicates, import/order */

export default NetworkLayer;

export { createFetch, createSubscribe, LocalTokenStorage, useAuthToken };

// FIXME: These should be type exports.
export {
  FetchOptions,
  SubscriptionClientOptions,
  SubscriptionOptions,
  TokenResponse,
  TokenStorage,
  Network,
  UseAuthTokenOptions,
};
