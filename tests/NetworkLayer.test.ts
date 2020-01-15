import fetchMock from 'fetch-mock-jest';
import { Network } from 'relay-runtime/lib/network/RelayNetworkTypes';

import NetworkLayer from '../src/NetworkLayer';

const defaultResponse = { data: { viewer: { id: 'hey' } }, errors: null };

describe('NetworkLayer', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  function mockEndpoint(resp: any = defaultResponse) {
    fetchMock.post('/graphql', resp);
  }

  // async to include errors thrown in execute
  // eslint-disable-next-line require-await
  async function run(
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

    expect(result).toEqual(defaultResponse);
  });

  it('should throw errors', async () => {
    const networkLayer = NetworkLayer.create({ batch: false });

    mockEndpoint({ data: null, errors: [{ message: 'err!' }] });

    const errors = await run(networkLayer).catch(errs => errs);

    expect(errors.json.errors).toHaveLength(1);
  });

  it('should not throw errors', async () => {
    const networkLayer = NetworkLayer.create({
      batch: false,
      throwErrors: false,
    });

    mockEndpoint({ data: {}, errors: [{ message: 'err!' }] });

    const resp = await run(networkLayer);

    expect(resp?.errors).toHaveLength(1);
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

    expect(result).toEqual(defaultResponse);
  });

  it('should error when subscriptions are not supported', async () => {
    const networkLayer = NetworkLayer.create();

    mockEndpoint();

    await expect(
      run(networkLayer, { kind: 'subscription' }),
    ).rejects.toThrowError(
      'This network layer does not support Subscriptions.',
    );
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

      expect(req1).toEqual(defaultResponse);
      expect(req2).toEqual(defaultResponse);

      [req1, req2] = await Promise.all([run(networkLayer), run(networkLayer)]);

      expect(fetchMock).toHaveFetchedTimes(2);

      expect(req1).toEqual(defaultResponse);
      expect(req2).toEqual(defaultResponse);
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
      const nl = NetworkLayer.create({ batch: false, authorization: '12345' });

      mockEndpoint();

      await run(nl);

      expect(fetchMock).toHaveFetched('/graphql', {
        headers: {
          Authorization: `Bearer 12345`,
        },
      });
    });

    it('should handle empty token', async () => {
      const nl = NetworkLayer.create({
        batch: { enabled: false },
        authorization: '',
      });

      mockEndpoint();

      await run(nl);

      expect(fetchMock).toHaveFetched('/graphql');
    });

    it('should allow custom auth header and prefix', async () => {
      const nl = NetworkLayer.create({
        batch: false,
        authorization: {
          token: '12345',
          headerName: 'YOLO',
          scheme: 'Dank',
        },
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
