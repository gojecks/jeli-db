# jeli-db (`jelidb`)

A client-side database for web apps. Tables live in the browser (IndexedDB, WebSQL/SQL or a flat-file store), are
queried through a transaction API or the `jQl` command language, and can sync with a FrontendOnly backend, including
live updates over a realtime socket.

```sh
npm install jelidb
```

## Quick start

```js
// memory, localStorage and sessionStorage are built in; register any other adapter first
jdb.storageAdapter.add('indexeddb', IndexedDBAdapter);   // dist/adapters/indexeddb

jdb('Shop', 1)
    .open({ storage: 'indexeddb', schemaPath: 'assets/schemas/' })
    .onCreate((event, next) => next())                  // first open
    .onUpgrade((event, next) => next())                 // version bump
    .then(event => {
        const db = event.result;

        // transaction API
        db.transaction('products', 'write')
            .onSuccess(tx => tx.result.insert([{ sku: 'A1', name: 'Lamp' }]).execute());

        // reading through jQl: select -[fields] -[table] -where(...) -limit(...) -orderBy(...)
        db.jQl('select -* -products', { onSuccess: console.log, onError: console.error });
    });
```

`open()` options include `storage`, `schemaPath`, `serviceHost`, `organisation`, `live` (realtime),
`ignoreSync`, `isClientMode`, `isLoginRequired`, `interceptor` and `useFrontendOnlySchema`. See
[`@types/index.d.ts`](@types/index.d.ts) for the full API.

## What's inside

| Path | Contents |
|---|---|
| `src/core` | Database, tables, transactions, query builder, schema handling, import/export |
| `src/plugins` | `jQl` commands: `create`, `alter`, `select`, `insert`, `update`, `delete`, `drop`, `truncate`, `batch`, `schema`, env commands |
| `src/connectors` | `realtime` (socket channels, presence), `sync` (push/pull with the server), `schedulers` |
| `src/services` | `users` and `sessions` |
| `packages/*` | Storage adapters (`indexeddb-adapter`, `sql-adapter`, `flat-file-adapter`), built to `dist/adapters/` |
| `@types` | TypeScript definitions |

## Server schema changes

With a FrontendOnly backend, a table whose server schema is newer (its `lastModified` moved on) is reloaded on the
next schema check. That happens when `alwaysCheckSchema` is set and the schema sync interval has passed. For
databases using `useFrontendOnlySchema`, a query that fails on an unknown column reloads that table's schema and
retries once.

## Development (this repo)

```sh
npm install
npm test             # mocha, test/**/*.spec.js
npm run build:pack   # rebuild dist/ (jdb.js, connectors, adapters, services)
```

Apps consume the bundled `dist/`, not `src/`, so rebuild after every change. Use `build:pack`: `npm run jdb` runs a
task chain that empties `dist/` and then stops on a missing grunt task, leaving no build behind.

## License

MIT
