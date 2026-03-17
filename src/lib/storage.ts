import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'storage.json');

export interface DbConnection {
  id: string;
  name: string;
  user: string;
  password?: string;
  connectString: string;
}

export interface StorageData {
  connections: DbConnection[];
  activeConnectionId: string | null;
  activeQuery: string;
  profileQuery: string;
  oracleClientPath: string;
}

const INITIAL_DATA: StorageData = {
  connections: [],
  activeConnectionId: null,
  activeQuery: 'SELECT * FROM DUAL',
  profileQuery: 'SELECT * FROM DUAL',
  oracleClientPath: 'C:\\orant\\Client\\instantclient_23_0'
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getData(): StorageData {
  ensureDataDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    saveData(INITIAL_DATA);
    return INITIAL_DATA;
  }
  try {
    const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading storage file:', error);
    return INITIAL_DATA;
  }
}

export function saveData(data: StorageData) {
  ensureDataDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
