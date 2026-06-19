declare module 'express-mysql-session' {
  import { Store } from 'express-session';

  interface MySQLStoreOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }

  type MySQLStoreConstructor = new (options: MySQLStoreOptions) => Store;

  function createMySQLStore(session: unknown): MySQLStoreConstructor;

  export = createMySQLStore;
}
