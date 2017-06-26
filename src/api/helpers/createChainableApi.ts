export function createChainableApi(
  name,
  Type,
  requestPromise,
  chainCallPromise
) {
  // re-use current promise if not resolved yet
  if (
    this[`${name}Promise`] &&
    this[`${name}Promise`].status === 0 &&
    this[`${name}Proxy`]
  ) {
    return this[`${name}Proxy`];
  }

  this[`${name}Promise`] = requestPromise();

  // TODO: Optimize this
  // Define properties on the promise for devtools
  Object.getOwnPropertyNames(Type.prototype).forEach(key => {
    Object.defineProperty(this[`${name}Promise`], key, {
      enumerable: true,
      writable: true,
      configurable: true,
    });
  });

  const proxyHandler = {
    get: (target, prop) => {
      // XXX which takes priority?
      // Check if property is property of an API object (Window, Buffer, Tabpage, etc)
      // If it is, then we return a promise of results of the call on that API object
      // i.e. await this.buffer.name will return a promise of buffer name

      const isOnPrototype = Object.prototype.hasOwnProperty.call(
        Type.prototype,
        prop
      );

      // Inspect the property descriptor to see if it is a getter or setter
      // Otherwise when we check if property is a method, it will call the getter
      const descriptor = Object.getOwnPropertyDescriptor(Type.prototype, prop);
      const isGetter =
        descriptor &&
        (typeof descriptor.get !== 'undefined' ||
          typeof descriptor.set !== 'undefined');

      // XXX: the promise can potentially be stale
      // Check if resolved, else do a refresh request for current buffer?
      if (Type && isOnPrototype) {
        if (
          isOnPrototype &&
          !isGetter &&
          typeof Type.prototype[prop] === 'function'
        ) {
          // If property is a method on Type, we need to invoke it with captured args
          return (...args) =>
            this[`${name}Promise`].then(res => res[prop].call(res, ...args));
        }

        // Otherwise return the property requested after promise is resolved
        return (
          (chainCallPromise && chainCallPromise()) ||
          this[`${name}Promise`].then(res => res[prop])
        );
      } else if (prop in target) {
        // Forward rest of requests to Promise
        if (typeof target[prop] === 'function') {
          return target[prop].bind(target);
        }
        return target[prop];
      }

      return null;
    },

    set: (target, prop, value, receiver) => {
      // eslint-disable-next-line no-param-reassign
      if (receiver && (receiver instanceof Promise || 'then' in receiver)) {
        receiver.then(obj => {
          if (prop in obj) {
            // eslint-disable-next-line no-param-reassign
            obj[prop] = value;
          }
        });
      } else {
        // eslint-disable-next-line no-param-reassign
        target[prop] = value;
      }

      // Maintain default assignment behavior
      return true;
    },
  };

  // Proxy the promise so that we can check for chained API calls
  this[`${name}Proxy`] = new Proxy(this[`${name}Promise`], proxyHandler);

  return this[`${name}Proxy`];
}
