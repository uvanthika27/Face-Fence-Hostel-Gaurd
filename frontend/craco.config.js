const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Suppress "Critical dependency" warnings from @vladmandic/face-api ESM bundle
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        {
          module: /@vladmandic\/face-api/,
          message: /Critical dependency/,
        },
      ];

      // face-api uses tfjs which needs these node polyfills to be false (not shimmed)
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          ...(webpackConfig.resolve?.fallback || {}),
          fs: false,
          path: false,
          crypto: false,
        },
      };

      return webpackConfig;
    },
  },
};
