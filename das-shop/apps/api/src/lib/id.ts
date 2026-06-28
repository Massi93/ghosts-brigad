import { randomBytes } from 'node:crypto';

export function createId(): string {
  return randomBytes(12).toString('base64url');
}
