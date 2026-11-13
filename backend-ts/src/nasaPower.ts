/** NASA POWER daily observations (AG community), not field-level sensor readings. */
export const POWER_PARAMETERS = [
  'T2M',
  'T2M_MAX',
  'T2M_MIN',
  'RH2M',
  'PRECTOTCORR',
  'WS2M',
  'ALLSKY_SFC_SW_DWN',
] as const;

type PowerParameter = (typeof POWER_PARAMETERS)[number];

const PARAMETER_FIELDS = {
  T2M: 'temperatureMeanC',
  T2M_MAX: 'temperatureMaxC',
  T2M_MIN: 'temperatureMinC',
  RH2M: 'relativeHumidityPercent',
  PRECTOTCORR: 'precipitationMm',
  WS2M: 'windSpeed2mMs',
  ALLSKY_SFC_SW_DWN: 'solarRadiation',
} as const;

export interface PowerRequest {
  latitude: number;
  longitude: number;
  start: string; // YYYY-MM-DD, Gregorian UTC calendar date
  end: string;
}

export interface PowerDay {
  date: string;
  temperatureMeanC: number | null;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  relativeHumidityPercent: number | null;
  precipitationMm: number | null;
  windSpeed2mMs: number | null;
  solarRadiation: number | null;
}

type NumericField = Exclude<keyof PowerDay, 'date'>;

export interface PowerData {
  source: {
    provider: 'NASA POWER';
    product: 'Daily Point';
    community: 'AG';
    timeStandard: 'LST';
    retrievedAt: string;
    url: string;
    note: string;
    units: Partial<Record<PowerParameter, string>>;
  };
  location: { latitude: number; longitude: number };
  period: { start: string; end: string; requestedDays: number };
  days: PowerDay[];
  summary: {
    precipitationTotalMm: number | null;
    averageTemperatureC: number | null;
    highestTemperatureC: number | null;
    lowestTemperatureC: number | null;
    averageHumidityPercent: number | null;
    observedDays: Record<NumericField, number>;
    missingValues: number;
    totalValues: number;
  };
}

export class PowerApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = 'PowerApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = '1981-01-01';
const ONE_DAY_MS = 86_400_000;

function parseDate(date: string, name: string): number {
  if (!DATE_RE.test(date)) {
    throw new PowerApiError('INVALID_DATE', `${name} must use YYYY-MM-DD`, 400);
  }
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== date) {
    throw new PowerApiError('INVALID_DATE', `${name} is not a valid date`, 400);
  }
  return ms;
}

function numberField(query: URLSearchParams, field: string, min: number, max: number): number {
  const values = query.getAll(field);
  if (values.length !== 1 || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(values[0].trim())) {
    throw new PowerApiError('INVALID_COORDINATES', `${field} must be a valid number`, 400);
  }
  const number = Number(values[0]);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new PowerApiError('INVALID_COORDINATES', `${field} must be between ${min} and ${max}`, 400);
  }
  return number;
}

export function validatePowerRequest(query: URLSearchParams, today = new Date()): PowerRequest {
  const latitude = numberField(query, 'lat', -90, 90);
  const longitude = numberField(query, 'lon', -180, 180);
  const startList = query.getAll('start');
  const endList = query.getAll('end');
  if (startList.length !== 1 || endList.length !== 1) {
    throw new PowerApiError('INVALID_DATE', 'start and end are required exactly once', 400);
  }
  const start = startList[0];
  const end = endList[0];
  const startMs = parseDate(start, 'start');
  const endMs = parseDate(end, 'end');
  const todayStr = today.toISOString().slice(0, 10);
  if (start < MIN_DATE || end > todayStr || startMs > endMs) {
    throw new PowerApiError('INVALID_DATE_RANGE', `Dates must be from ${MIN_DATE} through ${todayStr}, with start <= end`, 400);
  }
  if ((endMs - startMs) / ONE_DAY_MS + 1 > 366) {
    throw new PowerApiError('DATE_RANGE_TOO_LARGE', 'A request may contain at most 366 days', 400);
  }
  return { latitude, longitude, start, end };
}

export function buildPowerUrl(request: PowerRequest): string {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  url.searchParams.set('parameters', POWER_PARAMETERS.join(','));
  url.searchParams.set('community', 'AG');
  url.searchParams.set('latitude', String(request.latitude));
  url.searchParams.set('longitude', String(request.longitude));
  url.searchParams.set('start', request.start.replaceAll('-', ''));
  url.searchParams.set('end', request.end.replaceAll('-', ''));
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('time-standard', 'LST');
  return url.toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validValue(value: unknown, fillValue: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === -999 || value === fillValue) {
    return null;
  }
  return value;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function round(value: number | null, digits = 2): number | null {
  return value === null ? null : Number(value.toFixed(digits));
}

export function parsePowerResponse(raw: unknown, request: PowerRequest, sourceUrl: string, now = new Date()): PowerData {
  const doc = asRecord(raw);
  const props = asRecord(doc?.properties);
  const parameterGroup = asRecord(props?.parameter);
  if (!parameterGroup) {
    throw new PowerApiError('NASA_POWER_INVALID_RESPONSE', 'NASA POWER returned no parameter object', 502);
  }
  const header = asRecord(doc?.header);
  const fillValue = typeof header?.fill_value === 'number' ? header.fill_value : -999;
  const descriptors = asRecord(doc?.parameters);
  const units: Partial<Record<PowerParameter, string>> = {};
  const parameterValues = {} as Record<PowerParameter, Record<string, unknown>>;
  for (const code of POWER_PARAMETERS) {
    parameterValues[code] = asRecord(parameterGroup[code]) ?? {};
    const metadata = asRecord(descriptors?.[code]);
    if (typeof metadata?.units === 'string') units[code] = metadata.units;
  }

  const days: PowerDay[] = [];
  const startMs = parseDate(request.start, 'start');
  const endMs = parseDate(request.end, 'end');
  for (let dateMs = startMs; dateMs <= endMs; dateMs += ONE_DAY_MS) {
    const date = new Date(dateMs).toISOString().slice(0, 10);
    const key = date.replaceAll('-', '');
    const day = { date } as PowerDay;
    for (const code of POWER_PARAMETERS) {
      const field = PARAMETER_FIELDS[code] as NumericField;
      day[field] = validValue(parameterValues[code][key], fillValue);
    }
    days.push(day);
  }

  const fields = Object.values(PARAMETER_FIELDS);
  const observedDays = {} as Record<NumericField, number>;
  const values = {} as Record<NumericField, number[]>;
  for (const field of fields) {
    values[field] = days.map(day => day[field]).filter((v): v is number => v !== null);
    observedDays[field] = values[field].length;
  }
  const seen = Object.values(observedDays).reduce((a, b) => a + b, 0);
  return {
    source: {
      provider: 'NASA POWER', product: 'Daily Point', community: 'AG', timeStandard: 'LST',
      retrievedAt: now.toISOString(), url: sourceUrl,
      note: 'NASA POWER gridded satellite/model-based data; not an in-field soil or weather sensor measurement.',
      units,
    },
    location: { latitude: request.latitude, longitude: request.longitude },
    period: { start: request.start, end: request.end, requestedDays: days.length },
    days,
    summary: {
      precipitationTotalMm: values.precipitationMm.length ? round(values.precipitationMm.reduce((a, b) => a + b, 0)) : null,
      averageTemperatureC: round(mean(values.temperatureMeanC)),
      highestTemperatureC: values.temperatureMaxC.length ? Math.max(...values.temperatureMaxC) : null,
      lowestTemperatureC: values.temperatureMinC.length ? Math.min(...values.temperatureMinC) : null,
      averageHumidityPercent: round(mean(values.relativeHumidityPercent)),
      observedDays,
      missingValues: days.length * fields.length - seen,
      totalValues: days.length * fields.length,
    },
  };
}

interface CacheEntry { promise: Promise<PowerData>; expiresAt: number }

/** In-memory TTL cache + in-flight deduplication. No fabricated fallback data. */
export class NasaPowerClient {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly fetcher: typeof fetch;
  private readonly ttlMs: number;
  private readonly clock: () => number;

  constructor(fetcher: typeof fetch = fetch, ttlMs = 30 * 60 * 1000, clock: () => number = () => Date.now()) {
    this.fetcher = fetcher;
    this.ttlMs = ttlMs;
    this.clock = clock;
  }

  async fetchDaily(request: PowerRequest): Promise<PowerData> {
    const url = buildPowerUrl(request);
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > this.clock()) return cached.promise;
    this.cache.delete(url);

    const promise = this.retrieve(url, request).catch(error => {
      this.cache.delete(url); // never cache upstream failures
      throw error;
    });
    if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(url, { promise, expiresAt: this.clock() + this.ttlMs });
    return promise;
  }

  private async retrieve(url: string, request: PowerRequest): Promise<PowerData> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new PowerApiError('NASA_POWER_UNAVAILABLE', 'NASA POWER request failed or timed out', 503);
    }
    if (!response.ok) {
      throw new PowerApiError(
        'NASA_POWER_UPSTREAM_ERROR',
        `NASA POWER returned HTTP ${response.status}`,
        response.status === 429 || response.status >= 500 ? 503 : 502,
      );
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new PowerApiError('NASA_POWER_INVALID_RESPONSE', 'NASA POWER did not return valid JSON', 502);
    }
    return parsePowerResponse(raw, request, url);
  }
}
