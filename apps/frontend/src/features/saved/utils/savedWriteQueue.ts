const savedWriteQueues = new Map<string, Promise<unknown>>();

export function enqueueSavedWrite<T>(
  key: string,
  write: () => Promise<T>,
  onDrain: () => void
): Promise<T> {
  const previous = savedWriteQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  savedWriteQueues.set(key, next);

  void next
    .finally(() => {
      if (savedWriteQueues.get(key) === next) {
        savedWriteQueues.delete(key);
        onDrain();
      }
    })
    .catch(() => undefined);

  return next;
}
