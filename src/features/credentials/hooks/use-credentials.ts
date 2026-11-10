import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCredentialsParams} from "./use-credentials-params";
import { CredentialType } from "@/generated/prisma";




export const useSuspennseCredentials= ()=>{
    const trpc = useTRPC()
    const [params ]  = useCredentialsParams()

    return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params))
};



export const useCreateCredential = ()=>{
    
    const queryClient = useQueryClient()
    const trpc = useTRPC()
    return useMutation(
        
     trpc.credentials.create.mutationOptions({
        onSuccess: (data)=>{
           toast.success(` Credentials "${data.name}" created`)
           
           queryClient.invalidateQueries(
            trpc.credentials.getMany.queryOptions({})
           )
        },
        onError: (error)=>{
            toast.error(`Failed to create Credentials: ${error.message}`)
        }
     })
    
    
    )
    
}

export const useRemoveCredential = () =>{
    const trpc = useTRPC()
    const queryClient = useQueryClient()
    return useMutation(
        trpc.credentials.remove.mutationOptions({
            onSuccess: (data)=>{
                toast.success(`Credentials "${data.name}" removed`)
                queryClient.invalidateQueries(
                    trpc.credentials.getMany.queryOptions({}))
                queryClient.invalidateQueries(
                    trpc.credentials.getOne.queryFilter({ id: data.id}),
                )
                
            },
            onError: (error)=>{
                toast.error(`Failed to remove Credentials: ${error.message}`)
            }
        })
    )
}

export const useSuspennseCredential =(id:string)=>{
    const trpc = useTRPC()
    return useSuspenseQuery(
        trpc.credentials.getOne.queryOptions({id})
    )
    
}




export const useUpdateCredential = ()=>{
    
    const queryClient = useQueryClient()
    const trpc = useTRPC()
    return useMutation(
        
     trpc.credentials.update.mutationOptions({
        onSuccess: (data)=>{
           toast.success(`Credentials "${data.name}" saved`)
           
           queryClient.invalidateQueries(
            trpc.credentials.getMany.queryOptions({})
           );
           queryClient.invalidateQueries(
            trpc.credentials.getOne.queryOptions({id: data.id}),
           )
        },
        onError: (error)=>{
            toast.error(`Failed to save credentials: ${error.message}`)
        }
     })
    
    
    )
    
}

export const useUpdateCredentialName = ()=>{
    
    const queryClient = useQueryClient()
    const trpc = useTRPC()
    return useMutation(
        
     trpc.credentials.updateName.mutationOptions({
        onSuccess: (data)=>{
           queryClient.invalidateQueries(
            trpc.credentials.getMany.queryOptions({})
           );
           queryClient.invalidateQueries(
            trpc.credentials.getOne.queryOptions({id: data.id}),
           )
        },
        onError: (error)=>{
            toast.error(`Failed to update credential name: ${error.message}`)
        }
     })
    
    
    )
    
}

//Hook for fetch credetials by type
export const useCredentialsByType = (type:CredentialType)=>{
    const trpc = useTRPC()
    return useQuery(trpc.credentials.getByType.queryOptions({type} ))
}

export const useCredentialsByTypes = (types: CredentialType[])=>{
    const trpc = useTRPC()
    return useQuery(trpc.credentials.getByTypes.queryOptions({types} ))
}
