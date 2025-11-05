import { db } from '@/db';

export async function consolidateOnce() {
  try {
    const doneRec = await db.settings.get('consolidation_done');
    const isDone = typeof doneRec?.value === 'boolean' ? (doneRec.value as boolean) : false;
    if (isDone) return;

    await db.migrateFromLocalStorage();

    await db.settings.put({
      key: 'consolidation_done',
      value: true,
      lastUpdate: Date.now(),
      version: '1.0'
    });

    console.info('✅ Consolidation des données terminée.');
  } catch (e) {
    console.warn('❌ Consolidation a échoué:', e);
  }
}
