import { useState } from 'react';
import styled from 'styled-components';

import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  Card,
} from '../components';
import { defaultSnapOrigin } from '../config';
import {
  useMetaMask,
  useInvokeSnap,
  useMetaMaskContext,
  useRequestSnap,
} from '../hooks';
import { isLocalSnap, shouldDisplayReconnectButton } from '../utils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background?.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  color: ${({ theme }) => theme.colors.text?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const SuccessMessage = styled.div`
  background-color: #0a3d0a;
  border: 1px solid #00ff00;
  color: #00ff00;
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
`;

const ResultBox = styled.div`
  background-color: ${({ theme }) => theme.colors.background?.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 1.6rem;
  margin-top: 1.2rem;
  font-family: monospace;
  font-size: 1.2rem;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
`;

const QuantumButton = styled.button`
  display: flex;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  background: linear-gradient(135deg, #00d4ff 0%, #9000ff 100%);
  color: white;
  font-weight: bold;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Index = () => {
  const { error } = useMetaMaskContext();
  const { isFlask, snapsDetected, installedSnap } = useMetaMask();
  const requestSnap = useRequestSnap();
  const invokeSnap = useInvokeSnap();

  const [keysInitialized, setKeysInitialized] = useState(false);
  const [publicKeyData, setPublicKeyData] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? isFlask
    : snapsDetected;

  const handleInitializeKeys = async () => {
    setLoading('init');
    try {
      const result = await invokeSnap({ method: 'quantum_initialize' });
      setKeysInitialized(true);
      console.log('Keys initialized:', result);
    } catch (err) {
      console.error('Failed to initialize keys:', err);
    }
    setLoading(null);
  };

  const handleGetPublicKey = async () => {
    setLoading('pubkey');
    try {
      const result = (await invokeSnap({
        method: 'quantum_getPublicKey',
      })) as any;
      setPublicKeyData(result);
      console.log('Public key:', result);
    } catch (err) {
      console.error('Failed to get public key:', err);
    }
    setLoading(null);
  };

  const handleTestKeys = async () => {
    setLoading('test');
    try {
      const result = await invokeSnap({ method: 'quantum_testKeys' });
      setTestResult(result);
      console.log('Test result:', result);
    } catch (err) {
      console.error('Test failed:', err);
      setTestResult({ error: (err as Error).message });
    }
    setLoading(null);
  };

  return (
    <Container>
      <Heading>
        🔐 <Span>QuantumPools</Span>
      </Heading>
      <Subtitle>
        Post-Quantum Safe ERC-4337 Accounts with Dilithium Signatures
      </Subtitle>
      <CardContainer>
        {error && (
          <ErrorMessage>
            <b>An error happened:</b> {error.message}
          </ErrorMessage>
        )}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install MetaMask Flask',
              description:
                'QuantumPools requires MetaMask Flask to generate and manage your quantum-safe Dilithium keys.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!installedSnap && (
          <Card
            content={{
              title: 'Connect QuantumPools Snap',
              description:
                'Connect to install the QuantumPools snap which manages your Dilithium-3 post-quantum keypair.',
              button: (
                <ConnectButton
                  onClick={requestSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}
        {shouldDisplayReconnectButton(installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description: 'Update the snap after making changes.',
              button: (
                <ReconnectButton
                  onClick={requestSnap}
                  disabled={!installedSnap}
                />
              ),
            }}
            disabled={!installedSnap}
          />
        )}

        {/* Initialize Quantum Keys */}
        <Card
          content={{
            title: '1. Initialize Quantum Keys',
            description:
              'Generate your Dilithium-3 post-quantum keypair. This creates a 1952-byte public key and 4000-byte private key stored securely in the snap.',
            button: (
              <QuantumButton
                onClick={handleInitializeKeys}
                disabled={!installedSnap || loading === 'init'}
              >
                {loading === 'init'
                  ? '⏳ Generating...'
                  : keysInitialized
                    ? '✅ Keys Ready'
                    : '🔑 Initialize Keys'}
              </QuantumButton>
            ),
          }}
          disabled={!installedSnap}
        />

        {/* Get Public Key */}
        <Card
          content={{
            title: '2. Get Public Key',
            description:
              'Retrieve your Dilithium-3 public key. This 1952-byte key is used to verify your quantum-safe signatures.',
            button: (
              <QuantumButton
                onClick={handleGetPublicKey}
                disabled={
                  !installedSnap || !keysInitialized || loading === 'pubkey'
                }
              >
                {loading === 'pubkey' ? '⏳ Loading...' : '📤 Get Public Key'}
              </QuantumButton>
            ),
          }}
          disabled={!installedSnap || !keysInitialized}
        />

        {/* Test Keys */}
        <Card
          content={{
            title: '3. Test Quantum Signing',
            description:
              'Sign a test message with your Dilithium private key and verify the 3293-byte quantum-safe signature.',
            button: (
              <QuantumButton
                onClick={handleTestKeys}
                disabled={
                  !installedSnap || !keysInitialized || loading === 'test'
                }
              >
                {loading === 'test' ? '⏳ Signing...' : '✍️ Test Sign & Verify'}
              </QuantumButton>
            ),
          }}
          disabled={!installedSnap || !keysInitialized}
        />

        {/* Display Results */}
        {publicKeyData && (
          <SuccessMessage>
            <b>
              Dilithium-3 Public Key ({publicKeyData.publicKey?.bytes || 0}{' '}
              bytes)
            </b>
            <ResultBox>
              <div>
                <b>Algorithm:</b> {publicKeyData.algorithm}
              </div>
              <div>
                <b>Standard:</b> {publicKeyData.standard}
              </div>
              <div>
                <b>Size:</b> {publicKeyData.publicKey?.bytes} bytes (
                {publicKeyData.publicKey?.bits} bits)
              </div>
              <div>
                <b>Hash:</b> {publicKeyData.publicKey?.hash}
              </div>
              <div>
                <b>Preview:</b> {publicKeyData.publicKey?.preview?.first32Bytes}
                ...
              </div>
            </ResultBox>
          </SuccessMessage>
        )}

        {testResult && (
          <SuccessMessage>
            <b>✅ Quantum Signature Test Result</b>
            <ResultBox>{JSON.stringify(testResult, null, 2)}</ResultBox>
          </SuccessMessage>
        )}

        <Notice>
          <p>
            <b>🛡️ Post-Quantum Security:</b> QuantumPools uses
            CRYSTALS-Dilithium (NIST FIPS 204), a lattice-based signature scheme
            resistant to quantum computer attacks. Your keys are stored
            encrypted in the MetaMask snap and never leave your browser.
          </p>
        </Notice>
      </CardContainer>
    </Container>
  );
};

export default Index;
