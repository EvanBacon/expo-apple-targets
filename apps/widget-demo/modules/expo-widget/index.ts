declare global {
  namespace Native {
    interface ExpoWidget {
      set(key: string, value: string, suite?: string): void;
    }
  }

  interface NativeModules {
    ExpoWidget?: Native.ExpoWidget;
  }
}

// TODO: Can we drop this?
const m = (expo?.modules?.ExpoWidget ?? {
  set() {},
}) as Native.ExpoWidget;

export default m;
