// Explicit compatibility migration for pre-existing schema-builder code.
// Deliberately never imported by application startup.
const { createTables }=require('../src/config/schema');
createTables().then(()=>process.exit(0)).catch((error)=>{console.error(error);process.exit(1);});
