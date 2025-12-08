"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const getTimestamp = () => new Date().toISOString();
const log = {
    info: (...args) => console.log(`[INFO]`, getTimestamp(), ...args),
    warn: (...args) => console.warn(`[WARN]`, getTimestamp(), ...args),
    error: (...args) => console.error(`[ERROR]`, getTimestamp(), ...args),
};
exports.log = log;
//# sourceMappingURL=Logger.js.map