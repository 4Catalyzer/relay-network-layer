import { ExecuteFunction, Network } from 'relay-runtime';

import createFetch from './createFetch';
import createSubscribe from './createSubscribe';

interface NetworkLayer {
  execute: ExecuteFunction;
}

export interface NetworkLayerOptions {
  path?: string;
  url?: string;
  subscriptionUrl?: string;
  batch?: boolean;
  token?: string;
  authPrefix?: string;
  authHeader?: string;
  init?: RequestInit;
  batchTimeout?: number;
  maxSubscriptions?: number;
}

const SimpleNetworkLayer = {
  create({
    token,
    subscriptionUrl,
    maxSubscriptions,
    authPrefix = 'Bearer',
    authHeader = 'Authorization',
    init,
    batchTimeout,
    batch = true,
    url = '/graphql',
  }: NetworkLayerOptions = {}): NetworkLayer {
    return Network.create(
      createFetch({
        authPrefix,
        authHeader,
        init,
        batchTimeout,
        batch,
        url,
        token,
      }),
      subscriptionUrl
        ? createSubscribe({
            token,
            maxSubscriptions,
            url: subscriptionUrl,
          })
        : undefined,
    );
  },
};

export default SimpleNetworkLayer;
