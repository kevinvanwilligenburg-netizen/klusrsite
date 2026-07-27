/**
 * Minimale, dependency-vrije KV-client op de Upstash REST API (ook wat Vercel KV
 * onder water gebruikt). Zo kunnen we orders persistent opslaan zónder extra npm-
 * package.
 *
 * Activeren: maak in Vercel een KV/Upstash-store aan — dan worden deze env-vars
 * automatisch gezet:
 *   KV_REST_API_URL + KV_REST_API_TOKEN            (Vercel KV), of
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash)
 *
 * Zonder deze env-vars is KV uit en valt de orderstore terug op in-memory
 * (demo). Alle calls vangen fouten af en gooien NOOIT, zodat de checkout niet
 * kan breken door een KV-storing.
 */

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function isKvEnabled(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

/** Voer één Redis-commando uit via de REST API. Retourneert `null` bij elke fout. */
async function cmd<T = unknown>(args: (string | number)[]): Promise<T | null> {
  if (!isKvEnabled()) return null;
  try {
    const res = await fetch(KV_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[kv] command failed", args[0], res.status);
      return null;
    }
    const data = (await res.json()) as { result?: T; error?: string };
    if (data.error) {
      console.error("[kv] error", data.error);
      return null;
    }
    return (data.result ?? null) as T | null;
  } catch (err) {
    console.error("[kv] request error", err);
    return null;
  }
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const raw = await cmd<string>(["GET", key]);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJSON(key: string, value: unknown): Promise<void> {
  await cmd(["SET", key, JSON.stringify(value)]);
}

/** Atomic claim: zet `key` alleen als die nog niet bestaat. True = geclaimd. */
export async function kvSetNX(key: string, value: string): Promise<boolean> {
  const res = await cmd<string>(["SET", key, value, "NX"]);
  return res === "OK";
}

export async function kvDel(key: string): Promise<void> {
  await cmd(["DEL", key]);
}

export async function kvSAdd(key: string, member: string): Promise<void> {
  await cmd(["SADD", key, member]);
}

/** Verwijder een lid uit een set. */
export async function kvSRem(key: string, member: string): Promise<void> {
  await cmd(["SREM", key, member]);
}

export async function kvSMembers(key: string): Promise<string[]> {
  const res = await cmd<string[]>(["SMEMBERS", key]);
  return Array.isArray(res) ? res : [];
}

/** Zet een string met een TTL in seconden (EX). Voor kortlevende records. */
export async function kvSetEx(key: string, value: string, seconds: number): Promise<void> {
  await cmd(["SET", key, value, "EX", seconds]);
}

/**
 * Zet een string met TTL alleen als de key nog NIET bestaat (SET … EX … NX).
 * True = nieuw gezet (jij was de eerste), false = bestond al of KV uit/fout.
 * Handig om de éérste waarde (bijv. de herkomstbron) per bezoeker vast te leggen.
 */
export async function kvSetExNX(key: string, value: string, seconds: number): Promise<boolean> {
  const res = await cmd<string>(["SET", key, value, "EX", seconds, "NX"]);
  return res === "OK";
}

/** Lees meerdere keys in één keer (MGET). Mist een key → null op die positie. */
export async function kvMGet(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  const res = await cmd<(string | null)[]>(["MGET", ...keys]);
  return Array.isArray(res) ? res : keys.map(() => null);
}

/** Verhoog een hash-veld met `by` (HINCRBY). Voor per-bron tellers per dag. */
export async function kvHIncrBy(key: string, field: string, by = 1): Promise<void> {
  await cmd(["HINCRBY", key, field, by]);
}

/**
 * Lees alleen de opgegeven velden uit een hash (HMGET). Gebruik dit boven
 * kvHGetAll zodra je weet welke velden je nodig hebt: de hashes groeien met
 * elke verkoop, en dan is een volledige uitlezing per request verspilling.
 * Ontbrekende velden komen niet in het resultaat; leeg bij elke fout.
 */
export async function kvHMGet(key: string, fields: string[]): Promise<Record<string, string>> {
  if (!fields.length) return {};
  const res = await cmd<unknown>(["HMGET", key, ...fields]);
  const out: Record<string, string> = {};
  if (Array.isArray(res)) {
    fields.forEach((f, i) => {
      const v = res[i];
      if (v != null) out[f] = String(v);
    });
  }
  return out;
}

/**
 * Lees een hele hash als field→value object (HGETALL). Leeg bij elke fout.
 * Upstash REST kan de hash als vlakke array [field, value, …] of als object
 * teruggeven; beide vormen worden afgevangen.
 */
export async function kvHGetAll(key: string): Promise<Record<string, string>> {
  const res = await cmd<unknown>(["HGETALL", key]);
  if (Array.isArray(res)) {
    const out: Record<string, string> = {};
    for (let i = 0; i + 1 < res.length; i += 2) {
      out[String(res[i])] = String(res[i + 1]);
    }
    return out;
  }
  if (res && typeof res === "object") {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(res as Record<string, unknown>)) {
      out[k] = String(v);
    }
    return out;
  }
  return {};
}

/** Zet (of verleng) de TTL van een bestaande key, in seconden (EXPIRE). */
export async function kvExpire(key: string, seconds: number): Promise<void> {
  await cmd(["EXPIRE", key, seconds]);
}

/** Push een JSON-waarde vooraan een lijst (voor event-logs). */
export async function kvLPush(key: string, value: unknown): Promise<void> {
  await cmd(["LPUSH", key, JSON.stringify(value)]);
}

/** Knip de lijst af tot [start, stop] (om 'm begrensd te houden). */
export async function kvLTrim(key: string, start: number, stop: number): Promise<void> {
  await cmd(["LTRIM", key, start, stop]);
}

/** Lees JSON-waarden uit een lijst. */
export async function kvLRange<T>(key: string, start: number, stop: number): Promise<T[]> {
  const res = await cmd<string[]>(["LRANGE", key, start, stop]);
  if (!Array.isArray(res)) return [];
  return res
    .map((s) => {
      try {
        return JSON.parse(s) as T;
      } catch {
        return null;
      }
    })
    .filter((v): v is T => v != null);
}
