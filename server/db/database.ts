import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, 'automa.db'));
db.pragma('foreign_keys = ON');

export default db;