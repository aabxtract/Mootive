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
  apiUrl: (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  region: import.meta.env.VITE_AWS_REGION || import.meta.env.VITE_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || import.meta.env.VITE_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || import.meta.env.VITE_USER_POOL_CLIENT_ID,
  identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || import.meta.env.VITE_IDENTITY_POOL_ID,
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
  return cognitoSignIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
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
