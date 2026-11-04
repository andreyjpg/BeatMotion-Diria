import ConoceDiriaMock from "@/components/mocks/ConoceDiriaMock";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import { Redirect } from "expo-router";

// TODO(conoce): this screen doesn't exist in production builds until the
// academy's content is in; see TODO.md.
const ConoceDiriaScreen = () => {
  if (!SHOW_FEATURE_MOCKS) return <Redirect href="/private/home" />;
  return <ConoceDiriaMock />;
};

export default ConoceDiriaScreen;
