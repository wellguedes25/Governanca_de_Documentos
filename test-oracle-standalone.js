const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

const libDir = 'C:\\orant\\Client\\instantclient_23_0';

async function run() {
  try {
    console.log('Starting Oracle initialization test...');
    oracledb.initOracleClient({ libDir });
    console.log('✅ Oracle Client initialized successfully.');
    
    // We won't actually connect to the DB since we don't want to leak credentials here 
    // but the initialization is usually where the crash happens.
    
    console.log('Testing connection object creation...');
    console.log('oracledb version:', oracledb.versionString);
    
    console.log('Test finished successfully.');
  } catch (err) {
    console.error('❌ Oracle initialization failed:', err.message);
    process.exit(1);
  }
}

run();
