## websql

[![Build Status](https://travis-ci.org/wireapp/websql.svg?branch=master)](http://travis-ci.org/wireapp/websql)

##### Currently WIP

websql is a fork of [sql.js](https://github.com/kripken/sql.js) with some changes:

- Uses [sqleet](https://github.com/resilar/sqleet) which is SQLite with encryption enabled
- Database is persisted to IndexedDB, and can be synced using the `saveChanges` API
- WASM file is embed within the library so no need to worry about `locateFile`
- Use of Shared Worker (with MessageChannel and postMessage)
- Slightly different but easier API
- The API uses a transparent proxy so you don't need to deal with the Shared Worker communication
- `createFunction` and `each` has been removed from the API
- Removed old code related to ASM, only using WASM now
- Migrated Coffeescript API to Typescript
- Uses more modern build mechanisms

_Note_: No Shared Worker support means currently:

- Degraded support in Safari (use of Web Workers which does not allow multi-window env)
- Degraded support in Edge 18 and below (use of Pseudo Web Worker which runs in the main thread and does not allow multi-window env as Edge does not support window.crypto nor IndexedDB inside Workers) (Note that Edge 77 Beta supports Shared Worker as it is based on Chromium)

SQLite is under public domain, sql.js is MIT licensed and websql is GNU licensed.

## Demo

The demo is [available here](https://wireapp.github.io/websql/demo).

## Usage

No API docs yet. But you can check out the demo file [here](https://github.com/wireapp/websql/blob/master/demo/index.html).

`NOTHING` is now a reserved word in SQLite, whereas previously it was not. This could cause errors like `Error: near "nothing": syntax error`

## Compiling & Installation

### Install emsdk

#### macOS

```
brew install python2 && brew link python2
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
brew cask install java
./emsdk activate latest
source ./emsdk_env.sh
cd ..
```

#### Linux

```
sudo apt-get install python3 default-jre
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..
```

### Compile websql

```
cd websql
git submodule update --init --recursive
yarn
yarn build
```

### Run demo server

```
yarn demo
```

## Thanks

Thanks to the following people for their original work on sql.js:

- Ophir LOJKINE <pere.jobs@gmail.com> (https://github.com/lovasoa)
- @kripken
- @hankinsoft
- @firien
- @dinedal
- @taytay
