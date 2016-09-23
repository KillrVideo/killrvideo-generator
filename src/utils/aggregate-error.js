import { ExtendableError } from './extendable-error';

/**
 * Wraps multiple Error objects into a single error.
 */
export class AggregateError extends ExtendableError {
  constructor(errors) {
    super('Multiple errors occurred. See innerErrors property for details.');
    this.innerErrors = errors.reduce((acc, err) => {
      // Flatten other aggregate errors
      if (err instanceof AggregateError) {
        Array.prototype.push.apply(acc, err.innerErrors);
        return acc;
      }
      
      acc.push(err);
      return acc;
    }, []);
  }
};

export default AggregateError;