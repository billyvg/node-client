import { NVIM_SYNC, NVIM_SPEC, NVIM_METHOD_NAME } from './properties';
// Example
// @command('BufEnter', { range: '', nargs: '*' })
export function command(name, options = {}) {
  return function(cls, methodName) {
    // const {
    // sync,
    // ...opts,
    // } = options;

    const f = cls[methodName];
    const opts = {};
    const sync = !!options.sync;

    ['range', 'nargs'].forEach(option => {
      if (typeof options[option] !== 'undefined') {
        opts[option] = options[option];
      }
    });

    Object.defineProperty(f, NVIM_METHOD_NAME, { value: `command:${name}` });
    Object.defineProperty(f, NVIM_SYNC, { value: !!sync });
    Object.defineProperty(f, NVIM_SPEC, {
      value: {
        type: 'command',
        name,
        sync: !!sync,
        opts,
      },
    });
    // eslint-disable-next-line no-param-reassign
    cls[methodName] = f;
    return cls;
  };
};