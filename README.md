# Redux Generator Thunk

Generator thunk [middleware](http://redux.js.org/docs/advanced/Middleware.html) for Redux.

<!-- [![build status](https://img.shields.io/travis/gaearon/redux-generator-thunk/master.svg?style=flat-square)](https://travis-ci.org/gaearon/redux-generator-thunk)  -->
[![npm version](https://img.shields.io/npm/v/redux-generator-thunk.svg?style=flat-square)](https://www.npmjs.com/package/redux-generator-thunk)
[![npm downloads](https://img.shields.io/npm/dm/redux-generator-thunk.svg?style=flat-square)](https://www.npmjs.com/package/redux-generator-thunk)

```js
npm install --save redux-generator-thunk
```

## Motivation

Redux Generator Thunk [middleware](https://github.com/reactjs/redux/blob/master/docs/advanced/Middleware.md) allows you to write action creators that return a generator function instead of an action. The generator function receives `getState` as a parameter.

## Examples

An action creator that performs an async action:

```js
const INCREMENT_COUNTER = 'INCREMENT_COUNTER';

const increment = () => {
  return {
    type: INCREMENT_COUNTER
  };
};

const incrementAsync = () => {
  return function* () {
    yield delay(1000);
    yield increment();
  };
}
```

<!--
An action creator that returns a function to perform conditional dispatch:

```js
function incrementIfOdd() {
  return (dispatch, getState) => {
    const { counter } = getState();

    if (counter % 2 === 0) {
      return;
    }

    dispatch(increment());
  };
}
```

## What’s a thunk?!

A [thunk](https://en.wikipedia.org/wiki/Thunk) is a function that wraps an expression to delay its evaluation.

```js
// calculation of 1 + 2 is immediate
// x === 3
let x = 1 + 2;

// calculation of 1 + 2 is delayed
// foo can be called later to perform the calculation
// foo is a thunk!
let foo = () => 1 + 2;
```


## Installation

```
npm install --save redux-generator-thunk
```

Then, to enable Redux Thunk, use [`applyMiddleware()`](http://redux.js.org/docs/api/applyMiddleware.html):

```js
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-generator-thunk';
import rootReducer from './reducers/index';

// Note: this API requires redux@>=3.1.0
const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);
```

## Composition

Any return value from the inner function will be available as the return value of `dispatch` itself. This is convenient for orchestrating an asynchronous control flow with thunk action creators dispatching each other and returning Promises to wait for each other’s completion:

```js
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-generator-thunk';
import rootReducer from './reducers';

// Note: this API requires redux@>=3.1.0
const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

function fetchSecretSauce() {
  return fetch('https://www.google.com/search?q=secret+sauce');
}

// These are the normal action creators you have seen so far.
// The actions they return can be dispatched without any middleware.
// However, they only express “facts” and not the “async flow”.

function makeASandwich(forPerson, secretSauce) {
  return {
    type: 'MAKE_SANDWICH',
    forPerson,
    secretSauce
  };
}

function apologize(fromPerson, toPerson, error) {
  return {
    type: 'APOLOGIZE',
    fromPerson,
    toPerson,
    error
  };
}

function withdrawMoney(amount) {
  return {
    type: 'WITHDRAW',
    amount
  };
}

// Even without middleware, you can dispatch an action:
store.dispatch(withdrawMoney(100));

// But what do you do when you need to start an asynchronous action,
// such as an API call, or a router transition?

// Meet thunks.
// A thunk is a function that returns a function.
// This is a thunk.

function makeASandwichWithSecretSauce(forPerson) {

  // Invert control!
  // Return a function that accepts `dispatch` so we can dispatch later.
  // Thunk middleware knows how to turn thunk async actions into actions.

  return function (dispatch) {
    return fetchSecretSauce().then(
      sauce => dispatch(makeASandwich(forPerson, sauce)),
      error => dispatch(apologize('The Sandwich Shop', forPerson, error))
    );
  };
}

// Thunk middleware lets me dispatch thunk async actions
// as if they were actions!

store.dispatch(
  makeASandwichWithSecretSauce('Me')
);

// It even takes care to return the thunk’s return value
// from the dispatch, so I can chain Promises as long as I return them.

store.dispatch(
  makeASandwichWithSecretSauce('My wife')
).then(() => {
  console.log('Done!');
});

// In fact I can write action creators that dispatch
// actions and async actions from other action creators,
// and I can build my control flow with Promises.

function makeSandwichesForEverybody() {
  return function (dispatch, getState) {
    if (!getState().sandwiches.isShopOpen) {

      // You don’t have to return Promises, but it’s a handy convention
      // so the caller can always call .then() on async dispatch result.

      return Promise.resolve();
    }

    // We can dispatch both plain object actions and other thunks,
    // which lets us compose the asynchronous actions in a single flow.

    return dispatch(
      makeASandwichWithSecretSauce('My Grandma')
    ).then(() =>
      Promise.all([
        dispatch(makeASandwichWithSecretSauce('Me')),
        dispatch(makeASandwichWithSecretSauce('My wife'))
      ])
    ).then(() =>
      dispatch(makeASandwichWithSecretSauce('Our kids'))
    ).then(() =>
      dispatch(getState().myMoney > 42 ?
        withdrawMoney(42) :
        apologize('Me', 'The Sandwich Shop')
      )
    );
  };
}

// This is very useful for server side rendering, because I can wait
// until data is available, then synchronously render the app.

store.dispatch(
  makeSandwichesForEverybody()
).then(() =>
  response.send(ReactDOMServer.renderToString(<MyApp store={store} />))
);

// I can also dispatch a thunk async action from a component
// any time its props change to load the missing data.

import { connect } from 'react-redux';
import { Component } from 'react';

class SandwichShop extends Component {
  componentDidMount() {
    this.props.dispatch(
      makeASandwichWithSecretSauce(this.props.forPerson)
    );
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.forPerson !== this.props.forPerson) {
      this.props.dispatch(
        makeASandwichWithSecretSauce(nextProps.forPerson)
      );
    }
  }

  render() {
    return <p>{this.props.sandwiches.join('mustard')}</p>
  }
}

export default connect(
  state => ({
    sandwiches: state.sandwiches
  })
)(SandwichShop);
```

## Injecting a Custom Argument

Since 2.1.0, Redux Thunk supports injecting a custom argument using the `withExtraArgument` function:

```js
const store = createStore(
  reducer,
  applyMiddleware(thunk.withExtraArgument(api))
)

// later
function fetchUser(id) {
  return (dispatch, getState, api) => {
    // you can use api here
  }
}
```

To pass multiple things, just wrap them in a single object and use destructuring:

```js
const store = createStore(
  reducer,
  applyMiddleware(thunk.withExtraArgument({ api, whatever }))
)

// later
function fetchUser(id) {
  return (dispatch, getState, { api, whatever }) => {
    // you can use api and something else here here
  }
}
``` -->


## License

MIT
