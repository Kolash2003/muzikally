"use client";

import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { signIn } from '@/lib/auth-client';

const SignInPage = () => {
    return (
        <section className='flex flex-col items-center justify-center min-h-screen bg-background px-4 py-16 md:32'>
            <div className="flex flex-row justify-center items-center gap-x-2">
                <h1 className="text-3xl font-extrabold text-foreground">Welcome to</h1>
                <Image src={"/logo.svg"} alt="Logo" width={142} height={142} />
            </div>


            <p className="mt-2 text-lg text-muted-foreground font-semibold">
                Sign in below
            </p>

            <Button
                variant={"default"}
                className={
                    "max-w-sm mt-5 w-full px-7 py-7 flex flex-row justify-center items-center cursor-pointer"
                }
                onClick={() => signIn.social({
                    provider: "google",
                    callbackURL: "/"
                })}
            >
                <Image src={"/google.svg"} alt="Google" width={24} height={24} />
                <span className="font-bold ml-2">
                    Sign in with Google
                </span>
            </Button>
        </section>
    )
}

export default SignInPage;