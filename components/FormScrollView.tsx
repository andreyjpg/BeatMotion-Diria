import { ScrollView, type ScrollViewProps } from "react-native";

/**
 * ScrollView for screens with text inputs.
 * - iOS: when the keyboard opens, scrolls the focused input above it
 *   (automaticallyAdjustKeyboardInsets). Android resizes the window itself.
 * - The first tap on a button while the keyboard is open presses the button
 *   instead of only closing the keyboard.
 * (react-native-keyboard-controller does this more smoothly, but it isn't
 * available in Expo Go.)
 */
export default function FormScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      {...props}
    />
  );
}
