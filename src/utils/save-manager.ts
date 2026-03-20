import {
  GAME_SAVE_KEY,
  GAME_SAVE_VERSION,
  isGameSaveState,
  type GameSaveState,
} from './save-contract';

const DEFAULT_SAVE_KEY = 'rogue:save';

const SERIALIZED_TYPE_KEY = '__type';
const SERIALIZED_VALUE_KEY = 'value';

const BIGINT_TYPE = 'bigint';
const MAP_TYPE = 'map';
const SET_TYPE = 'set';

type SerializedSpecialValueType = typeof BIGINT_TYPE | typeof MAP_TYPE | typeof SET_TYPE;

interface SerializedSpecialValue {
  [SERIALIZED_TYPE_KEY]: SerializedSpecialValueType;
  [SERIALIZED_VALUE_KEY]: unknown;
}

export interface VersionedSavePayload<TData> {
  version: number;
  savedAt: number;
  data: TData;
}

export type ParseGuard<TValue> = (value: unknown) => value is TValue;

export interface SaveOptions {
  key?: string;
  version: number;
}

export interface LoadOptions<TData> extends SaveOptions {
  guard?: ParseGuard<TData>;
  migrate?: (previousData: unknown, previousVersion: number) => TData | null;
}

export interface SaveManagerConfig<TData> extends LoadOptions<TData> {
  key: string;
}

export interface SaveManager<TData> {
  hasSave: () => boolean;
  load: () => TData | null;
  save: (data: TData) => boolean;
  clear: () => void;
}

export function hasSave(key: string = DEFAULT_SAVE_KEY): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  return storage.getItem(key) !== null;
}

export function load<TData>({
  key = DEFAULT_SAVE_KEY,
  version,
  guard,
  migrate,
}: LoadOptions<TData>): TData | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const rawPayload = storage.getItem(key);
  if (!rawPayload) {
    return null;
  }

  const parsedPayload = safeJSONParse<unknown>(rawPayload);
  if (!isVersionedSavePayload(parsedPayload)) {
    return null;
  }

  if (parsedPayload.version === version) {
    if (guard && !guard(parsedPayload.data)) {
      return null;
    }
    return parsedPayload.data as TData;
  }

  if (!migrate) {
    return null;
  }

  const migrated = migrate(parsedPayload.data, parsedPayload.version);
  if (migrated === null) {
    return null;
  }

  if (guard && !guard(migrated)) {
    return null;
  }

  save(migrated, { key, version });
  return migrated;
}

export function save<TData>(
  data: TData,
  { key = DEFAULT_SAVE_KEY, version }: SaveOptions
): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  const payload: VersionedSavePayload<TData> = {
    version,
    savedAt: Date.now(),
    data,
  };

  const serializedPayload = safeJSONStringify(payload);
  if (serializedPayload === null) {
    return false;
  }

  try {
    storage.setItem(key, serializedPayload);
    return true;
  } catch {
    return false;
  }
}

export function clear(key: string = DEFAULT_SAVE_KEY): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(key);
}

export function createSaveManager<TData>(config: SaveManagerConfig<TData>): SaveManager<TData> {
  return {
    hasSave: () => hasSave(config.key),
    load: () => load(config),
    save: (data: TData) => save(data, config),
    clear: () => clear(config.key),
  };
}

export interface GameSaveManagerOptions {
  key?: string;
  version?: number;
  migrate?: (previousData: unknown, previousVersion: number) => GameSaveState | null;
}

export function createGameSaveManager(options: GameSaveManagerOptions = {}): SaveManager<GameSaveState> {
  return createSaveManager<GameSaveState>({
    key: options.key ?? GAME_SAVE_KEY,
    version: options.version ?? GAME_SAVE_VERSION,
    guard: isGameSaveState,
    migrate: options.migrate,
  });
}

export function safeJSONStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value, safeJSONReplacer);
  } catch {
    return null;
  }
}

export function safeJSONParse<TValue>(json: string): TValue | null {
  try {
    return JSON.parse(json, safeJSONReviver) as TValue;
  } catch {
    return null;
  }
}

function safeJSONReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return {
      [SERIALIZED_TYPE_KEY]: BIGINT_TYPE,
      [SERIALIZED_VALUE_KEY]: value.toString(),
    } satisfies SerializedSpecialValue;
  }

  if (value instanceof Map) {
    return {
      [SERIALIZED_TYPE_KEY]: MAP_TYPE,
      [SERIALIZED_VALUE_KEY]: Array.from(value.entries()),
    } satisfies SerializedSpecialValue;
  }

  if (value instanceof Set) {
    return {
      [SERIALIZED_TYPE_KEY]: SET_TYPE,
      [SERIALIZED_VALUE_KEY]: Array.from(value.values()),
    } satisfies SerializedSpecialValue;
  }

  return value;
}

function safeJSONReviver(_key: string, value: unknown): unknown {
  if (!isSerializedSpecialValue(value)) {
    return value;
  }

  switch (value[SERIALIZED_TYPE_KEY]) {
    case BIGINT_TYPE:
      return reviveBigInt(value[SERIALIZED_VALUE_KEY]);
    case MAP_TYPE:
      return reviveMap(value[SERIALIZED_VALUE_KEY]);
    case SET_TYPE:
      return reviveSet(value[SERIALIZED_VALUE_KEY]);
    default:
      return value;
  }
}

function reviveBigInt(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return BigInt(value);
  } catch {
    return value;
  }
}

function reviveMap(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return new Map(value);
}

function reviveSet(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return new Set(value);
}

function isVersionedSavePayload(value: unknown): value is VersionedSavePayload<unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.version === 'number'
    && Number.isFinite(value.version)
    && typeof value.savedAt === 'number'
    && Number.isFinite(value.savedAt)
    && 'data' in value
  );
}

function isSerializedSpecialValue(value: unknown): value is SerializedSpecialValue {
  if (!isRecord(value)) {
    return false;
  }

  if (!(SERIALIZED_TYPE_KEY in value) || !(SERIALIZED_VALUE_KEY in value)) {
    return false;
  }

  const serializedType = value[SERIALIZED_TYPE_KEY];
  return serializedType === BIGINT_TYPE || serializedType === MAP_TYPE || serializedType === SET_TYPE;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window.localStorage;
    return storage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
