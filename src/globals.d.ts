import 'react-relay-network-modern';

declare module 'react-relay-network-modern' {
  export const batchMiddleware: any;
  export class RelayNetworkLayerRequestBatch {
    requests: any[];
  }
}
