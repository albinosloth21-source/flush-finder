/**
 * Which sign-in buttons to show. Booleans only — never the secret values.
 * A method is on only when both of its server env vars are non-empty.
 */
export type SignInMethods = {
  google: boolean;
  x: boolean;
  apple: boolean;
  emailCode: boolean;
};

export const NO_SIGN_IN_METHODS: SignInMethods = {
  google: false,
  x: false,
  apple: false,
  emailCode: false,
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function signInMethodsFromEnv(env: Record<string, string | undefined> | NodeJS.ProcessEnv): SignInMethods {
  return {
    google: present(env.GOOGLE_CLIENT_ID) && present(env.GOOGLE_CLIENT_SECRET),
    x: present(env.TWITTER_CLIENT_ID) && present(env.TWITTER_CLIENT_SECRET),
    apple: present(env.APPLE_CLIENT_ID) && present(env.APPLE_CLIENT_SECRET),
    emailCode: present(env.RESEND_API_KEY) && present(env.EMAIL_FROM),
  };
}
