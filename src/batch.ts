import { Middleware } from './MiddlewareNetworkLayer';

export type BatchMiddlewareOpts = {
  batchTimeout?: number;
  maxBatchSize?: number;
  allowMutations?: boolean;
  method?: 'POST' | 'GET';
};

const batcher = {

}

const middleware: () => Middleware = () => (req, relay, next) => {
  if (relay.operation.operationKind === 'mutation' || relay.uploadables) {
    return next(req.);
  }

};
