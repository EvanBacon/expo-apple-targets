import { NativeModule, requireNativeModule } from "expo";

export type ExpoLiveActivityModuleEvents = {
  onLiveActivityCancel: () => void;
};

declare class ExpoLiveActivityModule extends NativeModule<ExpoLiveActivityModuleEvents> {
  areActivitiesEnabled(): boolean;
  isActivityInProgress(): boolean;
  startActivity(name: string, emoji: string): Promise<boolean>;
  updateActivity(emoji: string): void;
  endActivity(): void;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoLiveActivityModule>("ExpoLiveActivity");
