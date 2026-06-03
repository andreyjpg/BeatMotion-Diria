export default ({ config }) => {
  const ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";

  const isProd = ENV === "production";

  const appName = true ? "BeatMotion" : "BeatMotion QA";

  const androidPackage = isProd
    ? "com.andreydev.beatmotion"
    : "com.andreydev.beatmotion.qa";

  const iosBundleIdentifier = isProd
    ? "com.andreydev.beatmotion"
    : "com.andreydev.beatmotion.qa";

  return {
    expo: {
      name: appName,
      slug: "BeatMotion-Diria",
      version: "1.1.0",
      orientation: "portrait",
      icon: "./assets/images/LogoDiria.png",
      scheme: isProd ? "beatmotiondiria" : "beatmotiondiria-qa",
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      owner: "beatmotion",
      ios: {
        bundleIdentifier: iosBundleIdentifier,
        supportsTablet: true,
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
        },
      },
      android: {
        package: androidPackage,
        googleServicesFile: isProd
          ? "./google-services-production.json"
          : "./google-services-preview.json",
        adaptiveIcon: {
          foregroundImage: "./assets/images/LogoDiria.png",
          backgroundColor: "#000000",
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
      },
      web: {
        output: "static",
        favicon: "./assets/images/favicon.png",
      },
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          {
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
            backgroundColor: "#ffffff",
            dark: {
              backgroundColor: "#000000",
            },
          },
        ],
        "expo-web-browser",
        [
          "expo-notifications",
          {
            icon: "./assets/images/LogoDiria.png",
            color: "#000000",
          },
        ],
        [
          "@sentry/react-native/expo",
          {
            url: "https://sentry.io/",
            project: "react-native",
            organization: "beatmotion",
          },
        ],
      ],
      experiments: {
        typedRoutes: true,
        reactCompiler: false,
      },
      extra: {
        eas: {
          projectId: "e88f7e8e-f8d4-4a7f-bd33-507f1afc4cf2",
        },
      },
    },
  };
};
