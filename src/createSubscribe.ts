import {
  SubscribeFunction as BaseSubscribeFunction,
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
  token?: string | null;
  maxSubscriptions?: number;
}

export interface SubscriptionClient {
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

  protected token: string | null = null;

  readonly maxSubscriptions: number;

  constructor({
    url = '/socket.io/graphql',
    token = null,
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
    this.token = token;

    socket
      .on('connect', () => {
        this.authenticate();

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

  protected authenticate() {
    if (!this.token) {
      return;
    }

    this.emitTransient('authenticate', this.token);
  }

  subscribe(operation: RequestParameters, variables: Variables) {
    return Observable.create<GraphQLResponse>((sink) => {
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

  protected emitTransient(event: string, ...args: any[]) {
    // For transient state management, we re-emit on reconnect anyway, so no
    //  need to use the send buffer.
    if (!this.socket.connected) {
      return;
    }

    this.socket.emit(event, ...args);
  }

  private emitSubscribe(id: number, { query, variables }: any) {
    this.emitTransient('subscribe', { id, query, variables });
  }
}

export interface SubscriptionOptions<
  TSubscriptionClient extends SubscriptionClient
> {
  subscriptionClientClass: Class<TSubscriptionClient>;
  url?: string;
  token?: string;
  maxSubscriptions?: number;
}

export interface SubscribeFunction<
  TSubscriptionClient extends SubscriptionClient
> extends BaseSubscribeFunction {
  client: TSubscriptionClient;
  close(): void | Promise<void>;
}

function createSubscribeImpl<TSubscriptionClient extends SubscriptionClient>(
  subscriptionClient: TSubscriptionClient,
): SubscribeFunction<TSubscriptionClient> {
  function subscribeFn(operation: RequestParameters, variables: Variables) {
    return subscriptionClient.subscribe(operation, variables);
  }

  subscribeFn.client = subscriptionClient;
  subscribeFn.close = () => {
    subscriptionClient.close?.();
  };

  return subscribeFn;
}

function createSubscribe(
  options?: SubscriptionClientOptions,
): SubscribeFunction<SocketIoSubscriptionClient>;
function createSubscribe<TSubscriptionClient extends SubscriptionClient>(
  options: SubscriptionOptions<TSubscriptionClient>,
): SubscribeFunction<TSubscriptionClient>;
function createSubscribe(options: any): any {
  if (!options?.subscriptionClientClass) {
    return createSubscribeImpl(new SocketIoSubscriptionClient(options));
  }

  const { subscriptionClientClass, ...clientOptions } = options;

  // eslint-disable-next-line new-cap
  return createSubscribeImpl(new subscriptionClientClass(clientOptions));
}

export default createSubscribe;
