 
import React, { useReducer } from "react"
import { initialLoginState, loginReducer } from "./state"
import { initializeLogin, submitLogin } from "@/src/app/application/use-cases/auth/login"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function useLogin() {
     
    const router = useRouter()
    const [state, dispatch] = useReducer(loginReducer, initialLoginState)
     
    const navigateToDashboard = React.useCallback(() => {
        router.replace("/dashboard")
        router.refresh()
    }, [router])

    React.useEffect(() => { 
        let mounted = true 
        const run = async () => {
        console.log("Checking session on component mount...")
        dispatch({ type: "SESSION_CHECK_STARTED" })
        try {
            const { authenticated } = await initializeLogin()
            if (mounted && authenticated) {
            navigateToDashboard()
            }
        } finally {
            if (mounted) {
            dispatch({ type: "SESSION_CHECK_FINISHED" })
            }
        }
        } 
        void run()
        return () => {
            mounted = false
        }
    }, [navigateToDashboard])


    const onUserIdChange = (value: string) => {
         console.log("User ID changed:", value)
        dispatch({ type: "USERID_CHANGED", value })
    }

    const onPasswordChange = (value: string) => {
        console.log("Password changed:", value)
        dispatch({ type: "PASSWORD_CHANGED", value })
    }   

    const onSubmit = React.useCallback(
       async (e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault()
            dispatch({ type: "LOGIN_STARTED" })
            try {
                const result = await submitLogin({ username: state.username, password: state.password })
                if (!result.ok) { 
                    dispatch({ type: "LOGIN_FAILED", message: result.message || "Login failed. Please try again." })
                     toast.error(result.message || "Login failed")
                    return
                }
                navigateToDashboard()
            } finally {
                dispatch({ type: "LOGIN_FINISHED" })
            }
        },
        [navigateToDashboard, state.username, state.password]
    )


    return {
        state,
        onUserIdChange,
        onPasswordChange,
        onSubmit,
    }
}
