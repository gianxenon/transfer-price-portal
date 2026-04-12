'use client'

import { cn } from "@/src/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel, 
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useLogin } from "./use-login"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  
   const { state, onUserIdChange, onPasswordChange, onSubmit } = useLogin() 

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={onSubmit} className="p-6 md:p-8"  >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your Transfer Price Portal account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="username">User ID</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your user ID"
                  value={state.username}
                  onChange={(e) => onUserIdChange(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" value={state.password} onChange={(e) => onPasswordChange(e.target.value)} required />
              </Field>
               {/* {state.error && (
                <p className="text-destructive text-sm">{state.error}</p>
                )} */}
              <Field>
                <Button type="submit" disabled ={state.loading || state.checkingSession} >
                  {state.checkingSession ? "Checking session..." : state.loading ? "Logging in..." : "Login"}
                </Button>
              </Field>
              
              <FieldDescription className="text-center">
                Don&apos;t have an account? <a href="#">Sign up</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block min-h-105">
            <Image
              src="/logo_one.png"
              alt="Image"
              fill 
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              className="object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
