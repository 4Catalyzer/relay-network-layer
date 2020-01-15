module.exports = api => ({
  presets: [
    [
      '@4c',
      {
        target: 'web',
        development: api.env() === 'test',
        modules: api.env() === 'esm' ? false : 'commonjs',
      },
    ],
    '@babel/preset-typescript',
  ],
});
