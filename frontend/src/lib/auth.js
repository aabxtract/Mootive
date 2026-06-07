import { Amplify } from 'aws-amplify';
import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirm,
  resendSignUpCode as cognitoResend,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

let configured = false;
const SESSION_WAIT_ATTEMPTS = 8;
const SESSION_WAIT_DELAY_MS = 250;

export const env = {
  apiUrl: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
  identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
  mapName: import.meta.env.VITE_MAP_NAME || 'mootive-map',
  placeIndexName: import.meta.env.VITE_PLACE_INDEX_NAME || 'mootive-places',
};

export function hasCognitoConfig() {
  return Boolean(env.userPoolId && env.userPoolClientId);
}

function requireCognitoConfig() {
  if (!hasCognitoConfig()) {
    throw new Error('Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID.');
  }
}

export function configureAmplify() {
  if (configured || !hasCognitoConfig()) return;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: env.userPoolId,
        userPoolClientId: env.userPoolClientId,
        identityPoolId: env.identityPoolId,
        loginWith: { email: true },
      },
    },
    Geo: env.identityPoolId
      ? {
          LocationService: {
            region: env.region,
            maps: {
              items: { [env.mapName]: { style: 'VectorEsriNavigation' } },
              default: env.mapName,
            },
            search_indices: { items: [env.placeIndexName], default: env.placeIndexName },
          },
        }
      : undefined,
  });
  configured = true;
}

export async function signup({ name, email, phoneNumber, password }) {
  requireCognitoConfig();
  configureAmplify();
  const userAttributes = { email };
  if (name) userAttributes.name = name;
  if (phoneNumber) userAttributes.phone_number = phoneNumber;
  return cognitoSignUp({ username: email, password, options: { userAttributes } });
}

export async function confirmSignup({ email, code }) {
  requireCognitoConfig();
  configureAmplify();
  return cognitoConfirm({ username: email, confirmationCode: code });
}

export async function resendCode(email) {
  requireCognitoConfig();
  configureAmplify();
  return cognitoResend({ username: email });
}

export async function login(email, password) {
  requireCognitoConfig();
  configureAmplify();
  try {
    await cognitoSignOut();
  } catch {
    // A missing previous session should not block a fresh login.
  }
  const result = await cognitoSignIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
  if (!result.isSignedIn) {
    const step = result.nextStep?.signInStep || 'the next sign-in step';
    throw new Error(`Sign in is not complete. Complete ${step} first.`);
  }
  await waitForAuthSession();
  return result;
}

export async function logout() {
  configureAmplify();
  if (!hasCognitoConfig()) return;
  await cognitoSignOut();
}

export async function currentAuthUser() {
  configureAmplify();
  if (!hasCognitoConfig()) return null;
  try {
    const user = await getCurrentUser();
    const session = await waitForAuthSession();
    const claims = session.tokens?.idToken?.payload || {};
    return {
      username: user.username,
      sub: claims.sub,
      email: claims.email,
    };
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function idTokenFromSession(session) {
  return session?.tokens?.idToken || null;
}

export async function waitForAuthSession({ forceRefresh = false } = {}) {
  configureAmplify();
  requireCognitoConfig();
  let lastError = null;
  for (let attempt = 0; attempt < SESSION_WAIT_ATTEMPTS; attempt += 1) {
    try {
      const session = await fetchAuthSession({ forceRefresh: forceRefresh && attempt === 0 });
      if (idTokenFromSession(session)) return session;
    } catch (err) {
      lastError = err;
    }
    await sleep(SESSION_WAIT_DELAY_MS);
  }
  const err = new Error('Your sign-in session is not ready. Please sign in again.');
  err.cause = lastError;
  throw err;
}

export async function authToken() {
  configureAmplify();
  if (!hasCognitoConfig()) return null;
  try {
    const session = await waitForAuthSession();
    return idTokenFromSession(session)?.toString() || null;
  } catch {
    return null;
  }
}
