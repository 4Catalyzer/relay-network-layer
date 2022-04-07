import { ExecuteFunction, Network } from 'relay-runtime';

import createFetch, { BatchConfig } from './createFetch';
import type { SubscriptionClientOptions } from './createSubscribe';
import createSubscribe from './createSubscribe';

export interface Network {
  execute: ExecuteFunction;
  close: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

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
   * Controls the error behavior, when set, responses with an `errors` array will be turned into Errors
   * and thrown.
   *
   * Defaults: `true`
   *
   * ref: https://github.com/facebook/relay/issues/1816#issuecomment-304492071
   */
  throwErrors?: boolean;

  /**
   * Batches requests within a time frame into a single request for more
   * efficient fetching. requests are sent as a JSON array. Mutations and file uploads
   * are NOT batched.
   *
   * Defaults to `true`.
   *
   * **Requires a Graphql server that understands batching"
   */
  batch?: boolean | BatchConfig;

  /** The authorization configuration or token for a convenient shorthand */
  authorization?:
    | null
    | string
    | {
        token: string;
        /** The header the `token` is sent in defaults to "Authorization" */
        headerName?: string;

        /** The prefix string in the auth header defaults to "Bearer" */
        scheme?: string;
      };

  /**
   * Any fetch API "init" details, this is based directly to the `fetch` call, see
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) for API details.
   */
  init?: RequestInit | (() => RequestInit);

  /**
   * The max number of concurrent subscriptions allowed.
   * After the number has been no more will be set to the server (a console.warn is issued informing you the limit has been reached)
   *
   * The default is: `200`
   */
  maxSubscriptions?: number;

  /**
   * A constructor for a Socket.io client, allows choosing between major versions
   * of socket io. By default the subscription client will use whatever socket.io is installed (if any).
   */
  io?: SubscriptionClientOptions['io'];
}

const SimpleNetworkLayer = {
  create({
    url = '/graphql',
    subscriptionUrl,
    throwErrors,
    authorization,
    init,
    batch,
    io,
    maxSubscriptions,
  }: NetworkLayerOptions = {}) {
    const subscribeFn = subscriptionUrl
      ? createSubscribe({
          io,
          token:
            typeof authorization === 'string'
              ? authorization
              : authorization?.token,
          maxSubscriptions,
          url: subscriptionUrl,
        })
      : undefined;

    const network: any = Network.create(
      createFetch({
        authorization,
        throwErrors,
        init,
        batch,
        url,
      }),
      subscribeFn,
    );

    network.close = subscribeFn?.close || noop;

    return network as Network;
  },
};

export default SimpleNetworkLayer;
