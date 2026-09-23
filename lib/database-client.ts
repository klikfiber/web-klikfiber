import 'server-only';
import postgres from 'postgres';

// Reuse one bounded pool across commerce/admin and development reloads.
const scope = globalThis as typeof globalThis & { klikfiberDatabase?: ReturnType<typeof postgres> };
export const database = scope.klikfiberDatabase ??= postgres(process.env.DATABASE_URL!, {
  ssl:'require', max:5, prepare:false, connect_timeout:8, idle_timeout:20, max_lifetime:300,
  connection:{statement_timeout:15000},
});
