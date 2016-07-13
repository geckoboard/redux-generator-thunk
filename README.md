# Redux Generator Thunk

Generator thunk [middleware](http://redux.js.org/docs/advanced/Middleware.html) for Redux.

<!-- [![build status](https://img.shields.io/travis/gaearon/redux-generator-thunk/master.svg?style=flat-square)](https://travis-ci.org/gaearon/redux-generator-thunk)  -->
[![npm version](https://img.shields.io/npm/v/redux-generator-thunk.svg?style=flat-square)](https://www.npmjs.com/package/redux-generator-thunk)
[![npm downloads](https://img.shields.io/npm/dm/redux-generator-thunk.svg?style=flat-square)](https://www.npmjs.com/package/redux-generator-thunk)

```
npm install --save redux-generator-thunk
```

## Motivation

Redux Generator Thunk [middleware](https://github.com/reactjs/redux/blob/master/docs/advanced/Middleware.md) allows you to write action creators that return a generator function instead of an action.

When yielding a promise the generator will wait until the promises resolves before continuing. If the promise rejects the generator will throw an error (that can be caught using the usual `try/catch` syntax). This special treatment of promises makes asynchronous control flow much simpler (in a manner similar to the [async/await proposal](https://tc39.github.io/ecmascript-asyncawait/)).

Any non-promise values that are yielded are dispatched. This allows you to yield simple actions, or yield other generator thunks.

The generator function receives `getState` as a parameter.

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


## Installation

```
npm install --save redux-generator-thunk
```

Then, to enable Redux Generator Thunk, use [`applyMiddleware()`](http://redux.js.org/docs/api/applyMiddleware.html):

```js
import { createStore, applyMiddleware } from 'redux';
import generatorThunk from 'redux-generator-thunk';
import rootReducer from './reducers/index';

// Note: this API requires redux@>=3.1.0
const store = createStore(
  rootReducer,
  applyMiddleware(generatorThunk)
);
```

## Examples

### Async

```js
const INCREMENT_COUNTER = 'INCREMENT_COUNTER';

const increment = () => ({
  type: INCREMENT_COUNTER
});

const incrementAsync = () => {
  return function* () {
    yield delay(1000);
    yield increment();
  };
}
```

### Yielding an action depending on the state

```js
const INCREMENT_COUNTER = 'INCREMENT_COUNTER';

const incrementIfOdd = () => {
  return function* (getState) {
    const { counter } = getState();
    if (counter % 2 === 0) {
      return;
    }

    yield increment();
  };
}
```

### Nested actions and generators

```js
const requestPosts = reddit => ({
  type: REQUEST_POSTS,
  reddit
});

const receivePosts = (reddit, json) => {
  type: RECEIVE_POSTS,
  reddit,
  posts: json.data
});

// A standard generator (not an action)
const getPostsGenerator = function* (reddit) {
  const response = yield fetch(`https://www.reddit.com/r/${reddit}.json`);
};

const fetchPostsGenerator = reddit => {
  return function* () {
    yield requestPosts(reddit);

    // Use `yield*` to call standard generators who can then
    // wait for promises and dispatch actions themselves.
    const json = yield* getPostsGenerator(reddit);

    // Yield a standard action
    yield receivePosts(reddit, json);
  };
};

export const fetchPostsIfNeededGenerator = reddit => {
  return function* (getState) {
    const { posts } = getState();
    if (!posts[reddit]) {

      // We can yield generator thunks which will then run as normal.
      yield fetchPostsGenerator(reddit);
    }
  };
};
```

### Catching errors in promises

```js
const fetchPostsGenerator = reddit => {
  return function* () {
    yield requestPosts(reddit);

    let json;
    try {
      const response = yield fetch(`https://www.reddit.com/r/${reddit}.json`);
      json = yield response.json();
    } catch (err) {
      yield requestPostsFailed(reddit, err);
      return;
    }

    yield receivePosts(reddit, json);
  };
};
```




## License

MIT
