import {
  CacheConfig,
  ExecuteFunction,
  FetchFunction,
  RequestParameters,
  SubscribeFunction,
  UploadableMap,
  Variables,
} from 'relay-runtime';

export type Middleware = (
  req: Request,
  relay: RelayRequest,
  next: () => void,
) => void;

type RelayRequest = {
  operation: RequestParameters;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables?: UploadableMap | null;
};

interface Network {
  execute: ExecuteFunction;
}

interface Options {
  url: RequestInfo;
  init: RequestInit;
  middlewares: Middleware[];
  subscribe?: SubscribeFunction;
}

interface Data {
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

const MiddlewareNetworkLayer = {
  create({ middlewares = [], url, init, subscribe }: Options): Network {
    function run(req: Request, relay: RelayRequest, done: () => void) {
      middlewares.reduceRight((last: () => void, next) => {
        return () => next(req, relay, last);
      }, done)();
    }

    const fetchFn: FetchFunction = (
      operation,
      variables,
      cacheConfig,
      uploadables,
    ) => {
      if (operation.operationKind === 'subscription') {
        if (!subscribe)
          throw new Error(
            'Received a subscription request, however, subscriptions are not configured in the network layer',
          );
        return subscribe(operation, variables, cacheConfig);
      }

      return {
        subscribe(sink) {
          const controller = window.AbortController
            ? new window.AbortController()
            : null;

          const data = {
            id: operation.id || operation.name || String(uid++),
            query: operation.text || '',
            variables,
          };

          const req = new Request(url, {
            ...init,
            signal: controller?.signal,
            body: uploadables
              ? getFormData(data, uploadables)
              : JSON.stringify(data),
          });

          if (!uploadables && !req.headers.has('Content-Type')) {
            req.headers.set('Content-Type', 'application/json');
          }

          run(req, { operation, variables, cacheConfig, uploadables }, () => {
            fetch(req)
              .then(resp => {
                if (!resp.ok) {
                  return resp.text().then(txt => {
                    throw new Error(
                      `RelayNetworkLayerError: [${resp.status}]: ${txt}`,
                    );
                  });
                }

                return resp.json().then(json => {
                  if (json?.errors) {
                    throw new Error(
                      `GraphQLError: \n\n${JSON.stringify(json.errors)}`,
                    );
                  }
                  return json;
                });
              })
              .then(
                value => {
                  sink.next!(value);
                  sink.complete!();
                },
                err => {
                  if (err?.name === 'AbortError') sink.complete!();
                  else sink.error!(err);
                },
              );
          });

          return () => {
            controller?.abort();
          };
        },
      };
    };

    return {
      execute() {},
    };
  },
};
