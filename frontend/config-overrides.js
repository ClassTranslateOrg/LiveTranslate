
const webpack = require('webpack');

module.exports = function override(config) {
  // Add buffer fallback
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "buffer": require.resolve("buffer/")
  };

  // Add webpack plugin to provide Buffer
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  );

  return config;
};