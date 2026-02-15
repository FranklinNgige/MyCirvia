import { Injectable, OnModuleDestroy } from '@nestjs/common';
const Database = require('better-sqlite3');

type DB = {
  prepare: (sql: string) => {
    run: (...params: any[]) => any;
    get: (...params: any[]) => any;
    all: (...params: any[]) => any[];
  };
  exec: (sql: string) => void;
  close: () => void;
};

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly db: DB;

  constructor() {
    const url = process.env.DATABASE_URL ?? 'file:dev.sqlite';
    const path = url.startsWith('file:') ? url.slice(5) : url;
    this.db = new Database(path);
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  run(sql: string, params: any[] = []) {
    return this.db.prepare(sql).run(...params);
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  onModuleDestroy() {
    this.db.close();
  }
}
