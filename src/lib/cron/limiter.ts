export function createLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  const runNext = () => {
    if (queue.length > 0 && running < concurrency) {
      running++;
      const next = queue.shift();
      if (next) next();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          running--;
          runNext();
        }
      };

      queue.push(run);
      runNext();
    });
  };
}
