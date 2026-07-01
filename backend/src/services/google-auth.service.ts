/**
 * Google OAuth — ID token verification via Google's tokeninfo endpoint.
 * No extra SDK needed; uses the public tokeninfo REST API.
 */
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

export interface GooglePayload {
  sub: string;       // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GooglePayload> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!res.ok) {
    throw new UnauthorizedError('Invalid Google ID token');
  }

  const data = await res.json() as Record<string, string>;

  // Verify audience matches our client ID
  if (env.GOOGLE_CLIENT_ID && data.aud !== env.GOOGLE_CLIENT_ID) {
    throw new UnauthorizedError('Google token audience mismatch');
  }

  if (!data.email_verified || data.email_verified === 'false') {
    throw new UnauthorizedError('Google email not verified');
  }

  return {
    sub: data.sub,
    email: data.email,
    email_verified: data.email_verified === 'true',
    name: data.name ?? data.email.split('@')[0],
    picture: data.picture,
  };
}
