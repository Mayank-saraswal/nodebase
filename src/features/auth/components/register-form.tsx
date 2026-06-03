"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
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


const registerSchema = z.object({
    // name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required "),
    confirmPassword: z.string().min(1, "Confirm Password is required"),
})
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const router = useRouter();
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: ""
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
          


    const onSubmit = async (values: RegisterFormValues) => {
        try {
            const res = await fetch("/api/auth/custom-signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: values.email,
                    password: values.password,
                    name: values.email.split("@")[0]
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                sessionStorage.setItem("pendingEmail", values.email);
                router.push(`/check-email`);
            } else {
                toast.error(data.error || "Failed to create account");
            }
        } catch (error) {
            toast.error("Network error. Please try again.");
        }
    }
    const isPending = form.formState.isSubmitting;
    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>
                        Get Started
                    </CardTitle>
                    <CardDescription>
                        Create your account to get started
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-6">
                                <div className="flex flex-col gap-4">
                                    <Button
                                        onClick={signInGithub}
                                        variant="outline"
                                        className="w-full"
                                        type="button"
                                        disabled={isPending}
                                    >
                                        <Image
                                        src="logos/github.svg"
                                        alt="github"
                                        height={20}
                                        width={20}
                                        />

                                        Continue With GitHub
                                        
                                    </Button>

                                    <Button
                                    onClick={signInGoogle}
                                        variant="outline"
                                        className="w-full"
                                        type="button"
                                        disabled={isPending}
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
                                        render={({ field }) => (
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
                                                <FormMessage />

                                            </FormItem>
                                        )}
                                    />




                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
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
                                                <FormMessage />

                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Confirm Password
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="********"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />

                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" className="w-full" disabled={isPending}>
                                        Sign up

                                    </Button>

                                </div>
                                <div className="text-center text-sm">
                                    Already have an account?{" "}
                                    <Link href="/login" className="underline underline-offset-4">
                                        Login
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