export const DEFAULT_SIGNING_KEY = 'SIGNING_KEY_PLACEHOLDER';
export const HASH_ALGORITHM = 'SHA-256';

export type ApprovalEvidenceStage = 'request' | 'approved_and_executed' | 'rejected';

export interface EvidenceBundle<TPayload> {
  payload: TPayload;
  hash: string;
  signature: string;
}

export interface EvidenceVerificationResult {
  hashMatches: boolean;
  signatureMatches: boolean;
  expectedHash: string;
  expectedSignature: string;
}

export const EvidenceKeys = {
  configCopilotRun: (id: string) => `evidence/config_copilot_runs/${id}`,
  approvalPack: (packId: string, stage: ApprovalEvidenceStage) =>
    `evidence/approval_runs/${packId}/${stage}`,
  pipelinePack: (packId: string) => `evidence/pipeline_runs/${packId}`,
};

const getKvStore = () => {
  if (typeof window !== 'undefined' && window.spark?.kv) {
    return window.spark.kv;
  }

  if (typeof spark !== 'undefined' && spark?.kv) {
    return spark.kv;
  }

  return null;
};

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, nested]) => {
      acc[key] = normalizeValue(nested);
      return acc;
    }, {});
  }

  return value;
};

const stableStringify = (value: unknown): string => JSON.stringify(normalizeValue(value));

const getCrypto = () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is required for evidence hashing.');
  }

  return globalThis.crypto;
};

const hashBufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const hashEvidencePayload = async (payload: unknown): Promise<string> => {
  const data = stableStringify(payload);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const digest = await getCrypto().subtle.digest(HASH_ALGORITHM, buffer);
  return hashBufferToHex(digest);
};

export const signEvidenceHash = async (
  hash: string,
  signingKey: string = DEFAULT_SIGNING_KEY
): Promise<string> => {
  const signatureSeed = `${hash}:${signingKey}`;
  const encoder = new TextEncoder();
  const buffer = encoder.encode(signatureSeed);
  const digest = await getCrypto().subtle.digest(HASH_ALGORITHM, buffer);
  return hashBufferToHex(digest);
};

export const createEvidenceBundle = async <TPayload>(
  payload: TPayload,
  signingKey: string = DEFAULT_SIGNING_KEY
): Promise<EvidenceBundle<TPayload>> => {
  const hash = await hashEvidencePayload(payload);
  const signature = await signEvidenceHash(hash, signingKey);
  return { payload, hash, signature };
};

export const verifyEvidenceBundle = async <TPayload>(
  bundle: EvidenceBundle<TPayload>,
  signingKey: string = DEFAULT_SIGNING_KEY
): Promise<EvidenceVerificationResult> => {
  const expectedHash = await hashEvidencePayload(bundle.payload);
  const expectedSignature = await signEvidenceHash(expectedHash, signingKey);
  return {
    hashMatches: expectedHash === bundle.hash,
    signatureMatches: expectedSignature === bundle.signature,
    expectedHash,
    expectedSignature,
  };
};

export const storeEvidenceBundle = async <TPayload>(
  key: string,
  payload: TPayload,
  signingKey: string = DEFAULT_SIGNING_KEY
): Promise<EvidenceBundle<TPayload>> => {
  const kv = getKvStore();
  const bundle = await createEvidenceBundle(payload, signingKey);

  if (kv) {
    await kv.set(key, bundle);
  }

  return bundle;
};

export const getEvidenceBundle = async <TPayload>(
  key: string
): Promise<EvidenceBundle<TPayload> | null> => {
  const kv = getKvStore();
  if (!kv) {
    return null;
  }

  const bundle = await kv.get<EvidenceBundle<TPayload>>(key);
  return bundle ?? null;
};

export const downloadEvidenceBundle = (bundle: EvidenceBundle<unknown>, filename: string): void => {
  if (typeof window === 'undefined') {
    throw new Error('Evidence downloads are only supported in the browser.');
  }

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
