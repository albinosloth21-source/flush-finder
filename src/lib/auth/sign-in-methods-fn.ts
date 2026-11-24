import { createServerFn } from "@tanstack/react-start";
import { signInMethodsFromEnv, type SignInMethods } from "@/lib/auth/sign-in-methods";

/** Client-visible flags. The handler returns booleans and never echoes env values. */
export const getSignInMethods = createServerFn({ method: "GET" }).handler(async (): Promise<SignInMethods> => {
  return signInMethodsFromEnv(process.env);
});
