import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  requestId: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
};

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextStore>();

  static run(store: RequestContextStore, callback: () => void) {
    this.storage.run(store, callback);
  }

  static getStore() {
    return this.storage.getStore();
  }

  static setUser(userId: string) {
    const store = this.getStore();
    if (store) {
      store.userId = userId;
    }
  }
}
