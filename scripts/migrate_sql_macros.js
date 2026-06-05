const fs = require('fs');
const path = require('path');

const storagePath = path.join(__dirname, '../data/storage.json');

if (!fs.existsSync(storagePath)) {
  console.log('storage.json não encontrado. Nenhuma migração necessária.');
  process.exit(0);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
} catch (err) {
  console.error('Erro ao ler storage.json:', err);
  process.exit(1);
}

// Helper to replace the hardcoded strings with macros
function migrateString(str) {
  if (!str) return str;
  let newStr = str;
  // Replace the PIVOT columns block
  const pivotRegex = /MAX\(CASE WHEN CD_MULTI_EMPRESA = 3 THEN '1' ELSE '0' END\) AS "CSSJ", MAX\(CASE WHEN CD_MULTI_EMPRESA = 4 THEN '1' ELSE '0' END\) AS "HST", MAX\(CASE WHEN CD_MULTI_EMPRESA = 7 THEN '1' ELSE '0' END\) AS "HSC", MAX\(CASE WHEN CD_MULTI_EMPRESA = 10 THEN '1' ELSE '0' END\) AS "HSJ", MAX\(CASE WHEN CD_MULTI_EMPRESA = 11 THEN '1' ELSE '0' END\) AS "HMRP", MAX\(CASE WHEN CD_MULTI_EMPRESA = 25 THEN '1' ELSE '0' END\) AS "HCNSC", MAX\(CASE WHEN CD_MULTI_EMPRESA = 63 THEN '1' ELSE '0' END\) AS "HR"/g;
  newStr = newStr.replace(pivotRegex, '/* DYNAMIC_HOSPITALS_PIVOT */');
  
  // Replace the IN clause
  const inRegex = /\(3, 4, 7, 10, 11, 25, 63\)/g;
  newStr = newStr.replace(inRegex, '(/* DYNAMIC_HOSPITALS_IN */)');
  
  // Replace the DECODE clause
  const decodeRegex = /Decode\(NVL\(PA\.CD_MULTI_EMPRESA, PAE\.CD_MULTI_EMPRESA\),3, 'CSSJ',4,'HST',7,'HSC',10,'HSJ',11,'HMRP',25,'HCNSC',63,'HR'\)/g;
  newStr = newStr.replace(decodeRegex, '/* DYNAMIC_HOSPITALS_DECODE */');
  
  return newStr;
}

// Migrate all known query fields
['activeQuery', 'activeQueryV3', 'profileQuery'].forEach(key => {
  if (data[key]) data[key] = migrateString(data[key]);
});

['kpiQueries', 'kpiQueriesV3', 'analyticQueries', 'analyticQueriesV3'].forEach(group => {
  if (data[group]) {
    for (const key in data[group]) {
      data[group][key] = migrateString(data[group][key]);
    }
  }
});

fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
console.log('Migração concluída com sucesso. Macros aplicadas ao storage.json!');
