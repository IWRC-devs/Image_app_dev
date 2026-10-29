// Web hosting can use a subdirectory without changing Android or EAS config.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_PUBLIC_BASE_PATH
      ? { baseUrl: process.env.EXPO_PUBLIC_BASE_PATH }
      : {}),
  },
});
