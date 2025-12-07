const getTimestamp = () => new Date().toISOString();

const log = {
  info: (...args: any[]) => console.log(`[INFO]`, getTimestamp(), ...args),
  warn: (...args: any[]) => console.warn(`[WARN]`, getTimestamp(), ...args),
  error: (...args: any[]) => console.error(`[ERROR]`, getTimestamp(), ...args),
};

export { log };