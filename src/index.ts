import createFetch from './createFetch';
import createSubscribe from './createSubscribe';
import LocalTokenStorage from './LocalTokenStorage';
import NetworkLayer from './NetworkLayer';
import useAuthToken from './useAuthToken';

export type FetchOptions = import('./createFetch').FetchOptions;
export type SubscriptionOptions = import('./createSubscribe').SubscriptionOptions;
export type Network = import('./NetworkLayer').Network;
export type UseAuthTokenOptions = import('./useAuthToken').UseAuthTokenOptions;

export type TokenResponse = import('./LocalTokenStorage').TokenResponse;
export type TokenStorage = import('./LocalTokenStorage').TokenStorage;

export default NetworkLayer;

export { createFetch, createSubscribe, useAuthToken, LocalTokenStorage };
