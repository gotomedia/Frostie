const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) console.debug('🐛 [DEBUG]:', message, ...args);
  },

  info: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) console.info('ℹ️ [INFO]:', message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) console.warn('⚠️ [WARN]:', message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    // Errors always log regardless of DEBUG_MODE
    console.error('🔥 [ERROR]:', message, ...args);
  }
};