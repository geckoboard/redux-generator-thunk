import isGenerator from 'is-generator';
import isPromise from 'is-promise';

const handleGenerator = (generator, dispatch) => {
  const handle = ({ value, done }) => {
    if (done) return Promise.resolve(value);

    const result = isPromise(value) ? value : dispatch(value);
    return Promise.resolve(result)
      .then(res => handle(generator.next(res)))
      .catch(err => handle(generator.throw(err)));
  };

  try {
    return handle(generator.next());
  } catch (ex) {
    return Promise.reject(ex);
  }
};

const createGeneratorThunkMiddleware = extraArgument => {
  return ({ dispatch, getState }) => next => action => {
    if (isGenerator.fn(action)) {
      const generator = action(getState, extraArgument);
      return handleGenerator(generator, dispatch);
    }

    return next(action);
  };
};

const generatorThunk = createGeneratorThunkMiddleware();
generatorThunk.withExtraArgument = createGeneratorThunkMiddleware;

export default generatorThunk;
