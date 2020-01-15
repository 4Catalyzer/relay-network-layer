import {
  GraphQLResponse,
  Observable,
  RequestParameters,
  Variables,
} from 'relay-runtime';
import { Sink } from 'relay-runtime/lib/network/RelayObservable';
import io from 'socket.io-client';
import { Class } from 'utility-types';

export interface SubscriptionClientOptions {
  url?: string;
  token?: string;
  maxSubscriptions?: number;
}

interface SubscriptionClient {
  subscribe(
    operation: RequestParameters,
    variables: Variables,
  ): Observable<GraphQLResponse>;

  close?(): void | Promise<void>;
}

export class SocketIoSubscriptionClient implements SubscriptionClient {
  private nextSubscriptionId = 0;

  private subscriptions = new Map<
    number,
    {
      variables: Variables;
      query: string | null | undefined;
      sink: Sink<GraphQLResponse>;
    }
  >();

  readonly socket: SocketIOClient.Socket;

  readonly maxSubscriptions: number;

  constructor({
    token,
    url = '/socket.io/graphql',
    maxSubscriptions = 200,
  }: SubscriptionClientOptions = {}) {
    this.maxSubscriptions = maxSubscriptions;

    let origin, path;
    try {
      const parsed = new URL(url);
      origin = parsed.origin;
      path = parsed.pathname;
    } catch (err) {
      origin = window.location.origin;
      path = url;
    }

    const socket = io(origin, { path, transports: ['websocket'] });

    this.socket = socket;

    socket
      .on('connect', () => {
        if (token) {
          this.emitTransient('authenticate', token);
        }

        this.subscriptions.forEach((subscription, id) => {
          this.emitSubscribe(id, subscription);
        });
      })
      .on('subscription update', ({ id, ...payload }: any) => {
        const subscription = this.subscriptions.get(id);
        if (!subscription) {
          return;
        }

        subscription.sink.next(payload);
      });
  }

  subscribe(operation: RequestParameters, variables: Variables) {
    return Observable.create<GraphQLResponse>(sink => {
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
      this.emitSubscribe(id, subscription);

      return () => {
        this.emitTransient('unsubscribe', id);
        this.subscriptions.delete(id);
      };
    });
  }

  close() {
    this.socket.disconnect();
    this.subscriptions.forEach(({ sink }) => {
      sink.complete();
    });
  }

  private emitTransient(event: string, ...args: any[]) {
    // For transient state management, we re-emit on reconnect anyway, so no
    // need to use the send buffer.
    if (!this.socket.connected) {
      return;
    }

    this.socket.emit(event, ...args);
  }

  private emitSubscribe(id: number, { query, variables }: any) {
    this.emitTransient('subscribe', { id, query, variables });
  }
}

export interface SubscriptionOptions extends SubscriptionClientOptions {
  subscriptionClientClass?: Class<SubscriptionClient>;
}

export default function createSubscribe({
  subscriptionClientClass = SocketIoSubscriptionClient,
  ...options
}: SubscriptionOptions = {}) {
  // eslint-disable-next-line new-cap
  const subscriptionClient = new subscriptionClientClass(options);

  function subscribeFn(operation: RequestParameters, variables: Variables) {
    return subscriptionClient.subscribe(operation, variables);
  }

  subscribeFn.client = subscriptionClient;
  subscribeFn.close = () => {
    subscriptionClient.close?.();
  };

  return subscribeFn;
}
