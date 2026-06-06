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

export const env = {
  apiUrl: (localStorage.getItem('MOOTIVE_API_URL') || import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  region: import.meta.env.VITE_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
  identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
  mapName: import.meta.env.VITE_MAP_NAME || 'mootive-map',
  placeIndexName: import.meta.env.VITE_PLACE_INDEX_NAME || 'mootive-places',
};

export function setApiUrl(url) {
  const clean = url.trim().replace(/\/$/, '');
  localStorage.setItem('MOOTIVE_API_URL', clean);
  env.apiUrl = clean;
}

export function hasCognitoConfig() {
  return Boolean(env.userPoolId && env.userPoolClientId);
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
            maps: { items: { [env.mapName]: { style: 'VectorEsriNavigation' } }, default: env.mapName },
            search_indices: { items: [env.placeIndexName], default: env.placeIndexName },
          },
        }
      : undefined,
  });
  configured = true;
}

export async function signup({ name, email, phoneNumber, password }) {
  configureAmplify();
  if (!hasCognitoConfig()) throw new Error('Cognito not configured. Set VITE_USER_POOL_ID and VITE_USER_POOL_CLIENT_ID.');
  const userAttributes = { email };
  if (name) userAttributes.name = name;
  if (phoneNumber) userAttributes.phone_number = phoneNumber;
  return cognitoSignUp({ username: email, password, options: { userAttributes } });
}

export async function confirmSignup({ email, code }) {
  configureAmplify();
  return cognitoConfirm({ username: email, confirmationCode: code });
}

export async function resendCode(email) {
  configureAmplify();
  return cognitoResend({ username: email });
}

export async function login(email, password) {
  configureAmplify();
  try { await cognitoSignOut(); } catch {}
  return cognitoSignIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
}

export async function logout() {
  configureAmplify();
  if (hasCognitoConfig()) await cognitoSignOut();
}

export async function currentAuthUser() {
  configureAmplify();
  if (!hasCognitoConfig()) return null;
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
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

export async function authToken() {
  configureAmplify();
  if (!hasCognitoConfig()) return null;
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch {
    return null;
  }
}
