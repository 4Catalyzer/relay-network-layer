import {
  ConcreteBatch,
  RelayNetworkLayer,
  RelayNetworkLayerRequestBatch,
  Variables,
  authMiddleware,
  batchMiddleware,
  loggerMiddleware,
  urlMiddleware,
} from 'react-relay-network-modern';
import { Observable } from 'relay-runtime';
import io from 'socket.io-client';

// eslint-disable-next-line no-underscore-dangle
declare const __DEV__: boolean;

/**
 * ReactRelayNetworkModern expects response payloads to contain the request ID.
 * However, Apollo Server batch responses use position to match responses to
 * requests. This just copies over the request IDs by position.
 */
function assignBatchResponsePayloadIdsMiddleware() {
  return (next: any) => (req: any) => {
    if (!(req instanceof RelayNetworkLayerRequestBatch)) {
      return next(req);
    }

    return next(req).then((res: any) => {
      res.json.forEach((payload: any, i: number) => {
        if (!payload) {
          return;
        }

        // eslint-disable-next-line no-param-reassign
        payload.id = req.requests[i].id;
      });

      return res;
    });
  };
}

export interface NetworkLayerOptions {
  path: string;
  socketPath: string;
  token: string;
  authPrefix?: string;
  maxSubscriptions?: number;
}

export default class NetworkLayer {
  private readonly socket: SocketIOClient.Socket;

  private readonly subscriptions = new Map();

  private readonly maxSubscriptions: number;

  private nextSubscriptionId: number = 0;

  constructor({
    token,
    authPrefix,
    path,
    socketPath,
    maxSubscriptions = 200,
  }: NetworkLayerOptions) {
    const url = path;

    this.maxSubscriptions = maxSubscriptions;

    this.socket = io(origin, {
      path: socketPath,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      if (token) {
        this.emitTransient('authenticate', token);
      }

      this.subscriptions.forEach((subscription, id) => {
        this.subscribe(id, subscription);
      });
    });

    this.socket.on('subscription update', ({ id, ...payload }: any) => {
      const subscription = this.subscriptions.get(id);
      if (!subscription) {
        return;
      }

      subscription.sink.next(payload);
    });

    const network = new RelayNetworkLayer(
      [
        __DEV__ && loggerMiddleware(),
        urlMiddleware({ url }),
        batchMiddleware({ batchUrl: url }),
        authMiddleware({
          token,
          prefix: authPrefix,
          allowEmptyToken: true,
        }),
        assignBatchResponsePayloadIdsMiddleware(),
      ].filter(Boolean),
      {
        subscribeFn: this.subscribeFn,
      },
    );
    // @ts-ignore
    this.execute = network.execute;
  }

  subscribeFn = (operation: ConcreteBatch, variables: Variables) =>
    // @ts-ignore
    new Observable(sink => {
      const id = this.nextSubscriptionId++;

      if (this.subscriptions.size >= this.maxSubscriptions) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('subscription limit reached');
        }
        return undefined;
      }

      const subscription = {
        sink,
        query: operation.text,
        variables,
      };

      this.subscriptions.set(id, subscription);
      this.subscribe(id, subscription);

      return {
        unsubscribe: () => {
          this.emitTransient('unsubscribe', id);
          this.subscriptions.delete(id);
        },
      };
    });

  subscribe(id: number, { query, variables }: any) {
    this.emitTransient('subscribe', { id, query, variables });
  }

  emitTransient(event: string, ...args: any[]) {
    // For transient state management, we re-emit on reconnect anyway, so no
    // need to use the send buffer.
    if (!this.socket.connected) {
      return;
    }

    this.socket.emit(event, ...args);
  }

  close() {
    this.socket.disconnect();

    this.subscriptions.forEach(({ sink }) => {
      sink.complete();
    });
  }
}
