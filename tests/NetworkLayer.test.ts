import fetchMock from 'fetch-mock-jest';
import { Network } from 'relay-runtime/lib/network/RelayNetworkTypes';
import 'whatwg-fetch';

import NetworkLayer from '../src/NetworkLayer';

const defaultResponse = { data: { viewer: { id: 'hey' } }, errors: null };

describe('NetworkLayer', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  function mockEndpoint(resp: any = defaultResponse) {
    fetchMock.post('/graphql', resp);
  }

  function run(
    layer: Network,
    { files, kind = 'query', variables = {} }: any = {},
  ) {
    const $req = layer.execute(
      {
        id: '1',
        text: `query Foo {
          viewer {
            id
          }
       `,
        name: 'foo',
        operationKind: kind,
        metadata: {},
      },
      variables,
      {}, // cacheConfig
      files,
    );

    return $req.toPromise();
  }

  it('should send queries', async () => {
    const networkLayer = NetworkLayer.create({ batch: false });

    mockEndpoint();

    const result = await run(networkLayer);

    expect(fetchMock.lastOptions().body).toEqual(
      '{"id":"1","query":"query Foo {\\n          viewer {\\n            id\\n          }\\n       ","variables":{}}',
    );

    expect(fetchMock).toHaveFetched('/graphql', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(result).toEqual(defaultResponse.data);
  });

  it('should handle uploads', async () => {
    const networkLayer = NetworkLayer.create({ batch: false });

    mockEndpoint();

    const result = await run(networkLayer, {
      kind: 'mutation',
      files: {
        cert: new File(['hi', 'there'], 'foo.js'),
      },
    });

    const { body } = fetchMock.lastOptions();

    expect(body instanceof FormData).toEqual(true);

    expect(Array.from(body.keys())).toEqual([
      'id',
      'query',
      'variables',
      'cert',
    ]);

    expect(result).toEqual(defaultResponse.data);
  });

  describe('batching', () => {
    it('should batch requests', async () => {
      const networkLayer = NetworkLayer.create();

      mockEndpoint([defaultResponse, defaultResponse]);

      let [req1, req2] = await Promise.all([
        run(networkLayer),
        run(networkLayer),
      ]);

      expect(fetchMock).toHaveFetchedTimes(1);

      expect(req1).toEqual(defaultResponse.data);
      expect(req2).toEqual(defaultResponse.data);

      [req1, req2] = await Promise.all([run(networkLayer), run(networkLayer)]);

      expect(fetchMock).toHaveFetchedTimes(2);

      expect(req1).toEqual(defaultResponse.data);
      expect(req2).toEqual(defaultResponse.data);
    });

    it('should error for invalid response', async () => {
      const networkLayer = NetworkLayer.create();

      mockEndpoint();

      await expect(run(networkLayer)).rejects.toThrowError(
        'RelayNetworkLayerError: invalid batch response, must return a JSON array',
      );
    });

    it('should error for mismatched length', async () => {
      const networkLayer = NetworkLayer.create();

      mockEndpoint([]);

      await expect(run(networkLayer)).rejects.toThrowError(
        'RelayNetworkLayerError: invalid batch response, mismatched length, sent requests for 1 queries but received: 0',
      );
    });
  });

  describe('auth', () => {
    it('should add auth header', async () => {
      const nl = NetworkLayer.create({ batch: false, token: '12345' });

      mockEndpoint();

      await run(nl);

      expect(fetchMock).toHaveFetched('/graphql', {
        headers: {
          Authorization: `Bearer 12345`,
        },
      });
    });

    it('should handle empty token', async () => {
      const nl = NetworkLayer.create({ batch: false, token: '' });

      mockEndpoint();

      await run(nl);

      expect(fetchMock).toHaveFetched('/graphql');
    });

    it('should allow custom auth header and prefix', async () => {
      const nl = NetworkLayer.create({
        batch: false,
        token: '12345',
        authHeader: 'YOLO',
        authPrefix: 'Dank',
      });

      mockEndpoint();

      await run(nl);

      expect(fetchMock).toHaveFetched('/graphql', {
        headers: {
          YOLO: `Dank 12345`,
        },
      });
    });
  });
});
