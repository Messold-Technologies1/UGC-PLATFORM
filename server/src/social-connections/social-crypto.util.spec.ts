import {
  decryptSecret,
  encryptSecret,
  signState,
  verifyState,
} from './social-crypto.util';

const KEY = 'test-key-0123456789abcdef0123456789abcdef';

describe('social-crypto.util', () => {
  describe('encryptSecret / decryptSecret', () => {
    it('round-trips a token', () => {
      const token = 'IGQVJ...long-lived-token';
      const enc = encryptSecret(token, KEY);
      expect(enc).not.toContain(token);
      expect(decryptSecret(enc, KEY)).toBe(token);
    });

    it('produces a fresh IV each time (non-deterministic ciphertext)', () => {
      expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY));
    });

    it('fails to decrypt with the wrong key', () => {
      const enc = encryptSecret('secret', KEY);
      expect(() =>
        decryptSecret(enc, 'a-different-key-value-000000000000'),
      ).toThrow();
    });

    it('rejects tampered ciphertext (GCM auth tag)', () => {
      const enc = encryptSecret('secret', KEY);
      const parts = enc.split(':');
      const flipped = Buffer.from(parts[3], 'base64');
      flipped[0] ^= 0x01;
      parts[3] = flipped.toString('base64');
      expect(() => decryptSecret(parts.join(':'), KEY)).toThrow();
    });
  });

  describe('signState / verifyState', () => {
    it('round-trips the payload and nonce', () => {
      const { state, nonce } = signState({ cpid: 'c1', uid: 'u1' }, KEY);
      const payload = verifyState(state, KEY);
      expect(payload.cpid).toBe('c1');
      expect(payload.uid).toBe('u1');
      expect(payload.nonce).toBe(nonce);
    });

    it('rejects a bad signature', () => {
      const { state } = signState({ cpid: 'c1', uid: 'u1' }, KEY);
      expect(() =>
        verifyState(state, 'another-key-value-00000000000000'),
      ).toThrow();
    });

    it('rejects a tampered payload', () => {
      const { state } = signState({ cpid: 'c1', uid: 'u1' }, KEY);
      const sig = state.split('.')[1];
      const tampered = Buffer.from(
        JSON.stringify({
          cpid: 'attacker',
          uid: 'u1',
          nonce: 'x',
          iat: Date.now(),
        }),
      ).toString('base64url');
      expect(() => verifyState(`${tampered}.${sig}`, KEY)).toThrow();
    });

    it('rejects an expired state', () => {
      const { state } = signState({ cpid: 'c1', uid: 'u1' }, KEY);
      expect(() => verifyState(state, KEY, -1)).toThrow(/Expired/);
    });
  });
});
