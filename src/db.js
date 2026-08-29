import Dexie from 'dexie';

export const db = new Dexie('PhosGuardDB');

db.version(1).stores({
  settings: 'id, phosLimit, potassiumLimit, sodiumLimit, proteinLimit, fluidLimit',
  logs: '++id, date, timestamp, foodName, phos_mg, potassium_mg, sodium_mg, protein_g, fluid_ml, hasAdditiveWarning'
});

db.on('populate', () => {
  db.settings.add({
    id: 1,
    phosLimit: 1000,
    potassiumLimit: 3000,
    sodiumLimit: 2300,
    proteinLimit: 84,
    fluidLimit: 1500
  });
});
