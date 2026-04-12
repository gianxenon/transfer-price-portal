import { checkSession, LoginResult, loginWithCredentials } from "@/src/app/infrastructure/data-sources/auth/login"

 

type LoginSubmitInput = {
  username: string
  password: string
}

// Application use-case: check whether an authenticated session exists.
export async function initializeLogin(): Promise<{ authenticated: boolean }> {
  const authenticated = await checkSession()
  return { authenticated }
}

// Application use-case: submit credentials and return a framework-agnostic result.
export async function submitLogin(input: LoginSubmitInput): Promise<LoginResult> {
  return loginWithCredentials(input.username, input.password)
}
