import { Db, MongoClient } from 'mongodb';

import { AbstractClient } from './utils';

class MongoDB extends AbstractClient {
  private client: MongoClient | undefined;

  public _db: Db | undefined;

  async start() {
    this.client = await MongoClient.connect(this.config.MONGO_URI!, { useUnifiedTopology: true });
    this._db = this.client.db(this.config.MONGO_DB!);
  }

  get db() {
    if (!this._db) throw new Error('DB is undefined. start client first');

    return this._db;
  }

  async stop() {
    await this.client!.close();
  }
}

export default MongoDB;
