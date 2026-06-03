"use client"
import {zodResolver} from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"


const loginSchema = z.object({
  email: z.email("please enter a valid email addresss"),
  password: z.string().min(1,"Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent(){
    const router = useRouter();
    const searchParams = useSearchParams();
    const isVerified = searchParams.get("verified") === "true";

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });


    const signInGithub = async()=>{
        await authClient.signIn.social({
          provider:"github",
        },{
          onSuccess:()=>{
            router.push("/");
          },
          onError:(ctx)=>{
            toast.error(ctx.error.message || "Something went wrong");
          }
        })
    }


     const signInGoogle = async()=>{
        await authClient.signIn.social({
          provider:"google",
        },{
          onSuccess:()=>{
            router.push("/");
          },
          onError:(ctx)=>{
            toast.error(ctx.error.message || "Something went wrong");
          }
        })
    }
      

    const onSubmit = async(values:LoginFormValues)=>{
        await authClient.signIn.email({
            email:values.email,
            password:values.password,
            callbackURL:"/"
        },
        {
            onSuccess:()=>{
                router.push("/");
            },
            onError:(ctx)=>{
                // Check if the error is related to unverified email
                if (ctx.error.message?.includes("EMAIL_NOT_VERIFIED") || ctx.error.status === 403) {
                     toast.error(
                        <div className="flex flex-col gap-1">
                            <span>Please verify your email before logging in.</span>
                            <Link href="/resend-verification" className="underline font-medium">Resend verification email &rarr;</Link>
                        </div>
                     );
                } else {
                     toast.error(ctx.error.message);
                }
            }

        }
    )
    }
    const isPending = form.formState.isSubmitting;
    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                <CardTitle>
                    Welcome Back
                </CardTitle>
                <CardDescription>
                    Login to continue
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-6">
                                {isVerified && (
                                    <div className="p-3 bg-green-500/10 text-green-500 rounded-md text-sm text-center font-medium border border-green-500/20">
                                        Email verified! Enter your password to continue.
                                    </div>
                                )}
                                <div className="flex flex-col gap-4">
                                    <Button 
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    disabled={isPending}
                                    onClick={signInGithub}
                                    >
                                        <Image
                                        width={20}
                                        height={20}
                                        alt="github"
                                        src="logos/github.svg"
                                        />
                                        Continue With GitHub

                                    </Button>

                                       <Button 
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    disabled={isPending}
                                    onClick={signInGoogle}
                                    >
                                        <Image
                                        height={20}
                                        width={20}
                                        alt="google"
                                        src="/logos/google.svg"
                                        />
                                        
                                        Continue With Google

                                    </Button>

                                </div>
                                <div className="grid gap-6">
                                    <FormField
                                    control={form.control}
                                    name="email"
                                    render={({field})=>(
                                        <FormItem>
                                            <FormLabel>
                                                Email
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                type="email"
                                                placeholder="mayank@example.com"
                                                {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>

                                        </FormItem>
                                    )}
                                    />




                                     <FormField
                                    control={form.control}
                                    name="password"
                                    render={({field})=>(
                                        <FormItem>
                                            <FormLabel>
                                                Password
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                type="password"
                                                placeholder="********"
                                                {...field}
                                                />
                                            </FormControl>
                                            <FormMessage/>

                                        </FormItem>
                                    )}
                                    />

                                    <Button type="submit" className="w-full" disabled={isPending}>
                                        Login

                                    </Button>

                                </div>
                                <div className="text-center text-sm">
                                    Don&apos;'t have an account?{" "}
                                    <Link href="/signup" className="underline underline-offset-4">
                                        Sign Up
                                    </Link>
                                   
                                    
                                </div>

                            </div>

                        </form>

                    </Form>
                </CardContent>
            </Card>

        </div>
    );

}

export function LoginForm() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}