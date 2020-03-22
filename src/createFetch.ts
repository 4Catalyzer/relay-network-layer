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
  init?: RequestInit | (() => RequestInit);
  throwErrors?: boolean;
  authorization?:
    | null
    | string
    | {
        token: string;
        headerName?: string;
        scheme?: string;
      };
  batch?:
    | boolean
    | {
        enabled: boolean;
        timeoutMs?: number;
      };
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

  Object.keys(uploadables).forEach((key) => {
    formData.append(key, uploadables[key]);
  });

  return formData;
}

let batcher: null | {
  bodies: string[];
  sinks: Sink<GraphQLResponse>[];
} = null;

function normalizeBatch(batch: FetchOptions['batch'] = true) {
  const p = typeof batch === 'boolean' ? { enabled: batch } : {};
  return { timeoutMs: 0, ...p };
}

function normalizeAuth(auth: FetchOptions['authorization'] = '') {
  const p = typeof auth === 'string' ? { token: auth } : auth;
  return { token: '', scheme: 'Bearer', headerName: 'Authorization', ...p };
}

function createFetch({
  url = '/graphql',
  init: initOrThunk,
  authorization,
  throwErrors = true,
  batch,
}: FetchOptions = {}): FetchFunction {
  const batching = normalizeBatch(batch);
  const auth = normalizeAuth(authorization);

  function processJson(json: GraphQLResponse) {
    if (throwErrors && json?.errors) {
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
    const init =
      typeof initOrThunk === 'function' ? initOrThunk() : initOrThunk;

    const headers = new Headers(init?.headers);
    if (auth.token) {
      headers.set(auth.headerName, `${auth.scheme} ${auth.token}`);
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
    }).then((resp) => {
      if (!resp.ok) {
        return resp.text().then((txt) => {
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
          .then((batchResp) => {
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
                const resp = processJson(batchResp[idx]);
                sink.next!(resp);
                sink.complete!();
              } catch (err) {
                sink.error!(err);
              }
            });
          })
          // The catch is here instead of the 2nd then argument to ensure on
          // general errors all sinks are closed. For individual request errors
          // those are caught above in the loop so wouldn't make it here
          .catch((err) => {
            sinks.forEach((s) => s.error!(err));
          });
      }, batching.timeoutMs);
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
    // We use observables directly here instead of the promise value
    // in order to express Aborted requests unambiguously: completed with
    // no value sent.
    return Observable.create<GraphQLResponse>((sink) => {
      const data = {
        id: operation.id || operation.name || String(uid++),
        query: operation.text || '',
        variables,
      };

      const body = uploadables
        ? getFormData(data, uploadables)
        : JSON.stringify(data);

      if (
        batching.enabled &&
        !uploadables &&
        operation.operationKind !== 'mutation'
      ) {
        addToBatch(body as string, sink);

        return undefined;
      }

      const controller = window.AbortController
        ? new window.AbortController()
        : null;

      makeRequest<GraphQLResponse>(body, controller?.signal)
        .then(processJson)
        .then(
          (value) => {
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
