import { ExecuteFunction, Network } from 'relay-runtime';

import createFetch from './createFetch';
import createSubscribe from './createSubscribe';

interface NetworkLayer {
  execute: ExecuteFunction;
}

export interface NetworkLayerOptions {
  /** The graphql API endpoint, provide a pathname or fully qualified url. */
  url?: string;

  /**
   * The socket.io endpoint, provide a pathname or fully qualified url.
   *
   * **MUST** be provided in order to enable subscription support
   */
  subscriptionUrl?: string;

  /**
   * Batches requests within a time frame into a single request for more
   * efficient fetching. requests are sent as a JSON array. Mutatations and file uploads
   * are NOT batched.
   *
   * Defaults to `true`.
   *
   * **Requires a Graphql server that understands batching"
   */
  batch?: boolean;

  /** An authorization token sent in a header with every request */
  token?: string;

  /** The prefix string in the auth header defaults to "Bearer " */
  authPrefix?: string;

  /** The header the `token` is sent in defaults to "Authorization" */
  authHeader?: string;

  /**
   * Any fetch API "init" details, this is based directly to the `fetch` call, see
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) for API details.
   */
  init?: RequestInit;

  /**
   * The amount of time to wait before a batch is closed and sent to the server.
   *
   * The default is `0ms`, or about the next tick of the event loop.
   */
  batchTimeout?: number;

  /**
   * The max number of concurrent subscriptions allowed.
   * After the number has been no more will be set to the server (a console.warn is issued informing you the limit has been reached)
   *
   * The default is: `200`
   */
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
