"use client"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useRouter } from "next/navigation"

interface UpgradeModalProps{
    open:boolean
    onOpenChange:(open:boolean)=>void
}

export const UpgradeModal = ({open,onOpenChange}:UpgradeModalProps)=>{
    const router = useRouter()

    return(
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Upgrade Your Plan
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                       You need an active subscription to perform this action. Upgrade to a paid plan to unlock all features.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={()=> router.push("/pricing")}>
                        View Plans
                        </AlertDialogAction>
                 </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
    )
}