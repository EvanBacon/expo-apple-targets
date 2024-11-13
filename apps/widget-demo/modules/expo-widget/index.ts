declare global {
  namespace Native {
    interface ExpoWidget {
      set(key: string, value: string | number, suite?: string): void;
    }
  }

  interface NativeModules {
    ExpoWidget?: Native.ExpoWidget;
  }
}

// TODO: Can we drop this?
export default (expo?.modules?.ExpoWidget ?? {
  set() {},
}) satisfies Native.ExpoWidget;
