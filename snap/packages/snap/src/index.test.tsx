import { expect } from '@jest/globals';
import type { SnapConfirmationInterface, SnapAlertInterface } from '@metamask/snaps-jest';
import { installSnap } from '@metamask/snaps-jest';

describe('onRpcRequest', () => {
  describe('quantum_initialize', () => {
    it('initializes quantum keys and returns initialization data', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'quantum_initialize',
      });

      // Should return initialization data
      expect(response).toRespondWith(
        expect.objectContaining({
          status: 'initialized',
          algorithm: 'CRYSTALS-Dilithium3',
          standard: 'NIST FIPS 204',
          securityLevel: 'NIST Level 3 (AES-192 equivalent)',
          keyMetrics: expect.objectContaining({
            publicKeyHash: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('quantum_getPublicKey', () => {
    it('returns the quantum public key', async () => {
      const { request } = await installSnap();

      // First initialize
      await request({ method: 'quantum_initialize' });

      // Then get public key
      const response = await request({
        method: 'quantum_getPublicKey',
      });

      expect(response).toRespondWith(
        expect.objectContaining({
          algorithm: 'CRYSTALS-Dilithium3',
          standard: 'NIST FIPS 204',
          publicKey: expect.objectContaining({
            hex: expect.stringMatching(/^0x/),
            bytes: expect.any(Number),
            bits: expect.any(Number),
            hash: expect.stringMatching(/^0x/),
          }),
        }),
      );
    });
  });

  describe('quantum_testKeys', () => {
    it('tests key generation and signing with confirmation dialog', async () => {
      const { request } = await installSnap();

      // First initialize
      await request({ method: 'quantum_initialize' });

      // Test keys
      const response = request({
        method: 'quantum_testKeys',
      });

      // Should show alert dialog
      const ui = (await response.getInterface()) as SnapAlertInterface;
      expect(ui.type).toBe('alert');
      await ui.ok();

      // Should return test results
      expect(await response).toRespondWith(
        expect.objectContaining({
          status: 'success',
          algorithm: expect.objectContaining({
            name: 'CRYSTALS-Dilithium3',
          }),
          verification: expect.objectContaining({
            valid: true,
          }),
        }),
      );
    });
  });

  describe('quantum_signMessage', () => {
    it('signs a message with Dilithium key', async () => {
      const { request } = await installSnap();

      // First initialize
      await request({ method: 'quantum_initialize' });

      // Sign message
      const response = await request({
        method: 'quantum_signMessage',
        params: {
          message: '0x1234567890abcdef',
        },
      });

      expect(response).toRespondWith(
        expect.objectContaining({
          algorithm: 'CRYSTALS-Dilithium3',
          signature: expect.objectContaining({
            hex: expect.stringMatching(/^0x/),
            bytes: expect.any(Number),
          }),
        }),
      );
    });

    it('throws error if message is missing', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'quantum_signMessage',
        params: {},
      });

      expect(response).toRespondWithError(
        expect.objectContaining({
          message: 'message is required',
        }),
      );
    });
  });

  it('throws an error if the requested method does not exist', async () => {
    const { request } = await installSnap();

    const response = await request({
      method: 'unknown_method',
    });

    expect(response).toRespondWithError({
      code: -32603,
      message: 'Method not found: unknown_method',
      stack: expect.any(String),
    });
  });
});
