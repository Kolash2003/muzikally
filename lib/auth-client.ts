import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    /** No hardcoded baseURL — uses same origin, works on localhost + Railway */
})

export const { signIn, signOut, signUp, useSession } = authClient;