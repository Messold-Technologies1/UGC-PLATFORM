import { createVerify, X509Certificate } from 'node:crypto';

/** SNS POST body fields used for Signature Version 1 verification. */
export type SnsIncomingMessage = {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
  UnsubscribeURL?: string;
};

const CERT_CACHE = new Map<string, string>();
const CERT_CACHE_TTL_MS = 60 * 60 * 1000;
const certFetchedAt = new Map<string, number>();

function isAllowedSigningCertUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith('.amazonaws.com') &&
      (host.startsWith('sns.') || host.includes('.sns.'))
    );
  } catch {
    return false;
  }
}

function buildStringToSign(message: SnsIncomingMessage): string {
  const lines: string[] = [];
  const push = (value: string | undefined) => {
    lines.push(value ?? '');
  };

  if (
    message.Type === 'SubscriptionConfirmation' ||
    message.Type === 'UnsubscribeConfirmation'
  ) {
    push(message.Message);
    push(message.MessageId);
    push(message.SubscribeURL);
    push(message.Timestamp);
    push(message.Token);
    push(message.TopicArn);
    push(message.Type);
  } else if (message.Type === 'Notification') {
    push(message.Message);
    push(message.MessageId);
    if (message.Subject !== undefined) {
      push(message.Subject);
    }
    push(message.Timestamp);
    push(message.TopicArn);
    push(message.Type);
  } else {
    throw new Error(`Unsupported SNS message Type: ${message.Type}`);
  }

  return `${lines.join('\n')}\n`;
}

async function loadSigningCertificate(certUrl: string): Promise<string> {
  const now = Date.now();
  const fetched = certFetchedAt.get(certUrl);
  const cached = CERT_CACHE.get(certUrl);
  if (cached && fetched && now - fetched < CERT_CACHE_TTL_MS) {
    return cached;
  }

  const res = await fetch(certUrl, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to download SNS signing certificate: ${res.status}`);
  }
  const pem = await res.text();
  CERT_CACHE.set(certUrl, pem);
  certFetchedAt.set(certUrl, now);
  return pem;
}

export async function verifySnsMessageSignature(
  message: SnsIncomingMessage,
): Promise<boolean> {
  if (!isAllowedSigningCertUrl(message.SigningCertURL)) {
    return false;
  }

  const stringToSign = buildStringToSign(message);
  const pem = await loadSigningCertificate(message.SigningCertURL);
  const cert = new X509Certificate(pem);
  const publicKey = cert.publicKey;

  const signature = Buffer.from(message.Signature, 'base64');
  const algorithm =
    message.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';

  return createVerify(algorithm)
    .update(stringToSign, 'utf8')
    .verify(publicKey, signature);
}
