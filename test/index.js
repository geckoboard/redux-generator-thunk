import 'babel-polyfill';
import chai from 'chai';
import { spy } from 'sinon';
import generatorThunkMiddleware from '../src/index';
// import * as tt from 'typescript-definition-tester';


describe('thunk middleware', () => {
  let doDispatch;
  let doGetState;
  let nextHandler;
  let action1;
  let action2;
  let actionCreator1;
  let actionCreator2;

  beforeEach(() => {
    doDispatch = spy();
    doGetState = spy();
    nextHandler = generatorThunkMiddleware({dispatch: doDispatch, getState: doGetState});

    action1 = {
      type: 'TEST',
      value: 'one',
    };
    action2 = {
      type: 'TEST',
      value: 'two',
    };
    actionCreator1 = () => action1;
    actionCreator2 = () => action2;
  });

  it('must return a function to handle next', () => {
    chai.assert.isFunction(nextHandler);
    chai.assert.strictEqual(nextHandler.length, 1);
  });

  describe('handle next', () => {
    it('must return a function to handle action', () => {
      const actionHandler = nextHandler();

      chai.assert.isFunction(actionHandler);
      chai.assert.strictEqual(actionHandler.length, 1);
    });

    describe('handle action when NOT given a generator function', () => {
      it('must pass action to next', done => {
        const actionObj = {};

        const actionHandler = nextHandler(action => {
          chai.assert.strictEqual(action, actionObj);
          done();
        });

        actionHandler(actionObj);
      });

      it('must return the return value of next', () => {
        const expected = 'redux';
        const actionHandler = nextHandler(() => expected);

        const outcome = actionHandler();
        chai.assert.strictEqual(outcome, expected);
      });

      it('must pass the action to next when a generator (rather than a generator function) is passed', () => {
        const expected = 'redux';
        const actionHandler = nextHandler(() => expected);

        const generatorFn = function* generatorFn() {
          yield 1;
        };
        const generator = generatorFn();
        const outcome = actionHandler(generator);
        chai.assert.strictEqual(outcome, expected);
      });
    });

    describe('handle action when given a generator function', () => {
      it('returns a promise', done => {
        const expected = 'redux';
        const actionHandler = nextHandler(() => {});

        const generatorFn = function* generatorFn() {
          return expected;
        };
        const outcome = actionHandler(generatorFn);
        outcome.then(res => {
          chai.assert.strictEqual(res, expected);
          done();
        });
      });

      it('catches errors', done => {
        const expected = 'redux';
        const actionHandler = nextHandler(() => {});

        const generatorFn = function* generatorFn() {
          throw new Error(expected);
        };
        const outcome = actionHandler(generatorFn);
        outcome.catch(err => {
          chai.assert.strictEqual(err.message, expected);
          done();
        });
      });

      it('dispatches a yielded action', done => {
        const actionHandler = nextHandler(() => {});

        const generatorFn = function* generatorFn() {
          yield actionCreator1();
        };

        const outcome = actionHandler(generatorFn);
        outcome.then(() => {
          chai.assert.isOk(doDispatch.calledWithExactly(action1));
          done();
        });
      });

      it('dispatches multiple yielded actions', done => {
        const actionHandler = nextHandler(() => {});

        const generatorFn = function* generatorFn() {
          yield actionCreator1();
          yield actionCreator2();
        };

        const outcome = actionHandler(generatorFn);
        outcome.then(() => {
          chai.assert.isOk(doDispatch.calledTwice);
          chai.assert.isOk(doDispatch.firstCall.calledWithExactly(action1));
          chai.assert.isOk(doDispatch.secondCall.calledWithExactly(action2));
          done();
        });
      });

      it('yielded promises are not dispatched and return resolved value', done => {
        const actionCreatorWithArg = (res) => ({
          type: 'TEST',
          value: res,
        });

        const promise = Promise.resolve(1);
        const actionHandler = nextHandler(() => {});

        const generatorFn = function* generatorFn() {
          const res = yield promise;
          yield actionCreatorWithArg(res);
        };

        const outcome = actionHandler(generatorFn);
        outcome.then(() => {
          chai.assert.isOk(doDispatch.calledWithExactly({
            type: 'TEST',
            value: 1,
          }));
          done();
        });
      });

      it('generator thunks can be yielded', done => {
        const actionHandler = nextHandler(() => {});

        const actionCreatorWithGenerator = () => {
          return function* generatorThunk() {
            yield actionCreator1();
          };
        };

        const generatorFn = function* generatorFn() {
          yield actionCreatorWithGenerator();
          yield actionCreator2();
        };

        const outcome = actionHandler(generatorFn);
        outcome.then(() => {
          chai.assert.isOk(doDispatch.calledTwice);
          chai.assert.strictEqual(doDispatch.firstCall.args[0].name, 'generatorThunk');
          chai.assert.isOk(doDispatch.secondCall.calledWithExactly(action2));
          done();
        });
      });

      it('generators can be nested using yield*', done => {
        const actionHandler = nextHandler(() => {});

        const nestedGeneratorFn = function* nestedGeneratorFn() {
          yield actionCreator1();
        };

        const generatorFn = function* generatorFn() {
          yield* nestedGeneratorFn();
          yield actionCreator2();
        };

        const outcome = actionHandler(generatorFn);
        outcome.then(() => {
          chai.assert.isOk(doDispatch.calledTwice);
          chai.assert.isOk(doDispatch.firstCall.calledWithExactly(action1));
          chai.assert.isOk(doDispatch.secondCall.calledWithExactly(action2));
          done();
        });
      });

      it('generators can catch errors thrown in promises and continue', done => {
        const actionHandler = nextHandler(() => {});

        const promise = Promise.reject(new Error('nested error'));

        const generatorFn = function* generatorFn() {
          try {
            yield promise;
          } catch (err) {
            yield actionCreator1();
          }
          yield actionCreator2();
        };

        const outcome = actionHandler(generatorFn);
        outcome.then(() => {
          chai.assert.isOk(doDispatch.calledTwice);
          chai.assert.isOk(doDispatch.firstCall.calledWithExactly(action1));
          chai.assert.isOk(doDispatch.secondCall.calledWithExactly(action2));
          done();
        });
      });
    });
  });

  describe('handle errors', () => {
    it('must throw if argument is non-object', done => {
      try {
        generatorThunkMiddleware();
      } catch (err) {
        done();
      }
    });
  });

  describe('withExtraArgument', () => {
    it('must pass the third argument', done => {
      const extraArg = { lol: true };
      generatorThunkMiddleware.withExtraArgument(extraArg)({
        dispatch: doDispatch,
        getState: doGetState,
      })()(function* generator(getState, arg) {
        chai.assert.strictEqual(getState, doGetState);
        chai.assert.strictEqual(arg, extraArg);
        done();
      });
    });
  });

});
