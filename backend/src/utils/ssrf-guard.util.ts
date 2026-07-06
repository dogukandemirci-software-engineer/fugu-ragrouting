import dns from 'dns';
import { isIP } from 'net';

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  ipRange('10.0.0.0', 8),
  ipRange('172.16.0.0', 12),
  ipRange('192.168.0.0', 16),
  ipRange('127.0.0.0', 8),
  ipRange('169.254.0.0', 16), // includes cloud metadata endpoint 169.254.169.254
  ipRange('0.0.0.0', 8),
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipRange(base: string, prefixLength: number): [number, number] {
  const baseInt = ipToInt(base);
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return [(baseInt & mask) >>> 0, (baseInt | (~mask >>> 0)) >>> 0];
}

function isPrivateIPv4(ip: string): boolean {
  const int = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([start, end]) => int >= start && int <= end);
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' || // loopback
    normalized.startsWith('fc') || // unique local fc00::/7
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') || // link-local
    normalized === '::' ||
    normalized.startsWith('::ffff:127.') || // IPv4-mapped loopback
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:169.254.')
  );
}

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // unparsable — treat as unsafe
}

/**
 * Resolves the hostname and rejects if any resolved address is private/reserved
 * (RFC1918, loopback, link-local, or the cloud metadata IP). Protects webhook
 * dispatch against SSRF, including DNS-rebinding between creation and delivery —
 * callers must re-check immediately before every fetch, not just once at creation.
 */
export async function assertPublicHostname(urlString: string): Promise<void> {
  const url = new URL(urlString);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Webhook URL must use http or https');
  }

  const hostname = url.hostname;
  if (hostname === 'localhost') {
    throw new Error('Webhook URL resolves to a private or reserved address');
  }

  const directIpVersion = isIP(hostname);
  if (directIpVersion) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error('Webhook URL resolves to a private or reserved address');
    }
    return;
  }

  const results = await dns.promises.lookup(hostname, { all: true });
  for (const { address } of results) {
    if (isPrivateOrReservedIp(address)) {
      throw new Error('Webhook URL resolves to a private or reserved address');
    }
  }
}
