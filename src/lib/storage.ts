// Safe wrappers around localStorage / sessionStorage (they throw in some private-mode browsers).

export function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function write(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): state still works in memory */
  }
}
