# `relay-network-layer`

A simple Relay.js network layer with support for authorization, request batching and
subscriptions.

## Usage

```sh
yarn add relay-network-layer
```

### Quickstart

And when creating your Relay Environment import and use the `createFetch` method
to create a new fetch function:

```js
import {
  Environment,
  RecordSource,
  Store,
} from 'relay-runtime';

import NetworkLayer from 'relay-network-layer';

const network = NetworkLayer.create({
  url: '/graphql',

  token: accessToken,
}),

const store = new Store(new RecordSource());

const environment = return new Environment({
  store,
  network,
});
```

If your server supports subscriptions you can also provide the socket endpoint to listen on to configure subscriptions. See [subscriptions](#subscriptions) for more configuration options

```js
import NetworkLayer from 'relay-network-layer';

const network = NetworkLayer.create({
  url: '/graphql',
  subscriptionUrl: '/subscriptions/graphql',
  token: accessToken,
}),
```

### Advanced setup

For more nuanced configuration, or if you only want to one of the fetch or subscribe configurations factory methods are also provided to generate functions that can be
based directly to the base Relay Network:

```js
import { Network } from 'relay-runtime';

import { createFetch, createSubscribe } from 'relay-network-layer';

const network = Network.create(
  createFetch({
    url: '/graphql',
    token: accessToken,
  }),
  createSubscribe({
    url: '/subscriptions/graphql',
    maxSubscriptions: 150,
  }),
);
```

This way you can swap out your own subscription implementation or custom fetching logic.

### Subscriptions

Subscriptions are managed using `Socket.IO`'s websocket client, and implement
the following message flow:

ON `createSubscribe()`

- connect
- authenticate (if token is provided)
- any queued subscriptions are sent

ON a Relay `requestSubscription` call

- a `subscribe` message is sent to the server
- slient waits for a `subscription update` message.

#### Message Types

**`authenticate`**

Called when a token is provided, the server is expected to use the provided token
to authenticate subscriptions.

**`subscribe`**

Called with the subscription details

- `id: string`: operation id
- `query: string`: GraphQL operation as string or parsed GraphQL document node
- `variables?: Object`: Object with GraphQL variables

**`subscription update`**

Sent from the server with a GQL payload for a subscription

- `id: string`: operation id
- `data: any`: Execution result
- `errors?: Error[]`: Array of resolvers errors

**`unsubscribe`**

Called when a subscription is torn down on the client

- `id: string`: operation id

## API

### `NetworkLayer: { create(opts: NetworkOptions) => Network }`

Creates a Network that can be based directly to Relay's Environment constructor.

```js
import NetworkLayer from 'relay-network-layer';

const network = NetworkLayer.create(),
```

And to tear down subscription sockets call:

```js
network.close();
```

Create accepts a set of options of the type:

```ts
interface NetworkLayerOptions {
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
  batch?:
    | boolean
    | {
        enabled: boolean;

        /**
         * The amount of time to wait before a batch is closed and sent to the server.
         *
         * The default is `0ms`, or about the next tick of the event loop.
         */
        timeoutMs?: number;
      };

  /** The authorization configuration or token for a convenient shorthand */
  authorization?:
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
}
```

## `createFetch(FetchOptions)`

create's a fetching function that can be provided Relay's `Network.create()`. Takes
as set of options of the following type (description the same as for NetworkOptions)

```ts
export interface FetchOptions {
  url?: string;
  init?: RequestInit;
  token?: string;
  authPrefix?: string;
  authHeader?: string;
  batch?: boolean;
  batchTimeout?: number;
}
```

## `createSubscribe(SubscribeOptions)`

Create's a subscribe function that can be provided Relay's `Network.create()`. Takes
as set of options of the following type (description the same as for NetworkOptions)

```ts
export interface SubscriptionOptions {
  url?: string;
  token?: string;
  maxSubscriptions?: number;
}
```
