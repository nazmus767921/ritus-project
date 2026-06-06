import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { settings } from '../schema';

/**
 * Retrieves a setting value by key, returning a default value if not found.
 */
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const db = getDb();
    const rows = await db.select().from(settings).where(eq(settings.key, key));
    return rows.length > 0 ? rows[0].value : defaultValue;
  } catch (err) {
    console.error(`Failed to read setting for key: ${key}`, err);
    return defaultValue;
  }
}

/**
 * Upserts a setting value.
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx: any) => {
    // Attempt update
    await tx.update(settings)
      .set({ value })
      .where(eq(settings.key, key));
      
    // Verify if it exists, if not do insert
    const rows = await tx.select().from(settings).where(eq(settings.key, key));
    if (rows.length === 0) {
      await tx.insert(settings).values({ key, value });
    }
  });
}
