function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, any>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

export const warnOnce = memoize(console.warn);
export const logOnce = memoize(console.log);

export function createLogQueue(): {
  add: (fn: Function) => void;
  flush: () => void;
} {
  const queue: Function[] = [];

  const flush = () => {
    queue.forEach((fn) => fn());
    queue.length = 0;
  };

  return {
    flush,
    add: (fn: Function) => {
      queue.push(fn);
    },
  };
}

// Queue up logs so they only run when prebuild is actually running and not during standard config reads.
export const LOG_QUEUE = createLogQueue();

export function getSanitizedBundleIdentifier(value: string) {
  // According to the behavior observed when using the UI in Xcode.
  // Must start with a letter, period, or hyphen (not number).
  // Can only contain alphanumeric characters, periods, and hyphens.
  // Can have empty segments (e.g. com.example..app).
  return value.replace(/(^[^a-zA-Z.-]|[^a-zA-Z0-9-.])/g, "-");
}

export function sanitizeNameForNonDisplayUse(name: string) {
  return name
    .replace(/[\W_]+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
