import createFetch from './createFetch';
import createSubscribe from './createSubscribe';
import LocalTokenStorage from './LocalTokenStorage';
import NetworkLayer from './NetworkLayer';
import useAuthToken from './useAuthToken';

import type { FetchOptions } from './createFetch';
import type { SubscriptionClientOptions, SubscriptionOptions } from './createSubscribe';
import type { TokenResponse, TokenStorage } from './LocalTokenStorage';
import type { Network } from './NetworkLayer';
import type { UseAuthTokenOptions } from './useAuthToken';

export default NetworkLayer;

export { createFetch, createSubscribe, LocalTokenStorage, useAuthToken };

export type { FetchOptions, SubscriptionClientOptions, SubscriptionOptions, TokenResponse, TokenStorage, Network, UseAuthTokenOptions };
