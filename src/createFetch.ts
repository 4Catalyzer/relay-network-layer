import {
  CacheConfig,
  FetchFunction,
  GraphQLResponse,
  Observable,
  RequestParameters,
  UploadableMap,
  Variables,
} from 'relay-runtime';
import { Sink } from 'relay-runtime/lib/network/RelayObservable';

export interface FetchOptions {
  url?: string;
  init?: RequestInit;
  token?: string;
  authPrefix?: string;
  authHeader?: string;
  batch?: boolean;
  batchTimeout?: number;
}

export interface Data {
  id: string;
  query: string;
  variables: {};
}

let uid = 0;

function getFormData(
  { id, query, variables }: Data,
  uploadables: UploadableMap,
) {
  const formData = new FormData();
  formData.append('id', id);
  formData.append('query', query);
  formData.append('variables', JSON.stringify(variables));

  Object.keys(uploadables).forEach(key => {
    formData.append(key, uploadables[key]);
  });

  return formData;
}

let batcher: null | {
  bodies: string[];
  sinks: Sink<GraphQLResponse>[];
} = null;

function createFetch({
  url = '/graphql',
  init,
  token,
  authPrefix = 'Bearer',
  authHeader = 'Authorization',
  batchTimeout,
  batch = true,
}: FetchOptions = {}): FetchFunction {
  function processJson(json: GraphQLResponse) {
    if (json?.errors) {
      const gqlError = new Error(
        `GraphQLError: \n\n${JSON.stringify(json.errors)}`,
      );
      (gqlError as any).json = json;
      throw gqlError;
    }
    return json;
  }

  function makeRequest<T>(
    body: string | FormData,
    signal?: AbortSignal,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set(authHeader, `${authPrefix} ${token}`);
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', '*/*');
    }
    if (typeof body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      method: 'POST',
      ...init,
      body,
      signal,
      headers,
    }).then(resp => {
      if (!resp.ok) {
        return resp.text().then(txt => {
          const httpError = new Error(
            `RelayNetworkLayerError: [${resp.status}]: ${txt}`,
          );
          (httpError as any).status = resp.status;
          throw httpError;
        });
      }

      return resp.json();
    });
  }

  /**
   * Queues a single request, that is flushed on the next tick (or `batchTimeout`).
   */
  function addToBatch(reqBody: string, reqSink: Sink<GraphQLResponse>) {
    if (!batcher) {
      batcher = {
        bodies: [],
        sinks: [],
      };

      setTimeout(() => {
        const { bodies, sinks } = batcher!;

        batcher = null;

        makeRequest<GraphQLResponse[]>(`[${bodies.join(',')}]`)
          .then(batchResp => {
            if (!batchResp || !Array.isArray(batchResp)) {
              throw new Error(
                'RelayNetworkLayerError: invalid batch response, must return a JSON array',
              );
            }
            if (batchResp.length !== sinks.length) {
              throw new Error(
                `RelayNetworkLayerError: invalid batch response, mismatched length, sent requests for ${sinks.length} queries but received: ${batchResp.length}`,
              );
            }

            // Match the response with the sink and finish each request
            sinks.forEach((sink, idx) => {
              try {
                const data = processJson(batchResp[idx]);
                sink.next!(data);
                sink.complete!();
              } catch (err) {
                sink.error!(err);
              }
            });
          })
          .catch(err => {
            sinks.forEach(s => s.error!(err));
          });
      }, batchTimeout);
    }

    batcher.bodies.push(reqBody);
    batcher.sinks.push(reqSink);
  }

  function fetchFn(
    operation: RequestParameters,
    variables: Variables,
    _cacheConfig?: CacheConfig,
    uploadables?: UploadableMap,
  ) {
    return Observable.create<GraphQLResponse>(sink => {
      const data = {
        id: operation.id || operation.name || String(uid++),
        query: operation.text || '',
        variables,
      };

      const body = uploadables
        ? getFormData(data, uploadables)
        : JSON.stringify(data);

      if (batch && !uploadables && operation.operationKind !== 'mutation') {
        addToBatch(body as string, sink);

        return undefined;
      }

      const controller = window.AbortController
        ? new window.AbortController()
        : null;

      makeRequest<GraphQLResponse>(body, controller?.signal)
        .then(processJson)
        .then(
          value => {
            sink.next!(value);
            sink.complete!();
          },
          (err: Error) => {
            if (err?.name === 'AbortError') sink.complete!();
            else sink.error!(err);
          },
        );

      return () => {
        controller?.abort();
      };
    });
  }

  return fetchFn;
}

export default createFetch;
