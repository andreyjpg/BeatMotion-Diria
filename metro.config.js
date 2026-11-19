const { withNativeWind } = require("nativewind/metro");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// The app targets iOS/Android; the web build is only used for quick testing in
// a browser. Native-only modules without a web version resolve to an empty
// module there (e.g. video embeds simply don't render on web).
const WEB_EMPTY_MODULES = new Set(["react-native-web-webview"]);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_EMPTY_MODULES.has(moduleName)) {
    return { type: "empty" };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });