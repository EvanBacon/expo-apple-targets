type NativeModule = {
  setInt(key: string, value: number, suite?: string): void;
  setString(key: string, value: string, suite?: string): void;
  remove(key: string, suite?: string): void;
  reloadWidget(name?: string): void;
  setObject(
    key: string,
    value: Record<string, string | number>,
    suite?: string
  ): boolean;
  setArray(
    key: string,
    value: Record<string, string | number>[],
    suite?: string
  ): boolean;
};

// @ts-expect-error
const ExtensionStorageModule = expo?.modules?.ExtensionStorage;

const nativeModule: NativeModule = ExtensionStorageModule ?? {
  setInt() {},
  setString() {},
  reloadWidget() {},
  setObject() {},
  remove() {},
  setArray() {},
};

const originalSetObject = nativeModule.setObject;

// Sweet API doesn't support doing this natively.
nativeModule.setObject = (
  key: string,
  value: Record<string, string | number>,
  suite?: string
) => {
  if (Array.isArray(value)) {
    return nativeModule.setArray(key, value, suite);
  }
  return originalSetObject(key, value, suite);
};

export class ExtensionStorage {
  static reloadWidget(name?: string) {
    nativeModule.reloadWidget(name);
  }

  constructor(private readonly appGroup: string) {}

  set(
    key: string,
    value?:
      | string
      | number
      | Record<string, string | number>
      | Array<Record<string, string | number>>
  ) {
    if (typeof value === "number") {
      nativeModule.setInt(key, value, this.appGroup);
    } else if (Array.isArray(value)) {
      nativeModule.setArray(key, value, this.appGroup);
    } else if (typeof value === "string") {
      nativeModule.setString(key, value, this.appGroup);
    } else if (value == null) {
      nativeModule.remove(key, this.appGroup);
    } else {
      nativeModule.setObject(key, value, this.appGroup);
    }
  }
}
