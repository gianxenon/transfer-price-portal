 
import {
  SidebarInset 
} from "@/components/ui/sidebar"
import { TPUploaderUI } from "@/src/app/features/auth/dashboard/tp-uploader/tp-uploader" 

export default function TPUploader() {
  return ( 
     <>
     <SidebarInset> 
       <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 md:gap-6 "> 
              <TPUploaderUI />
          </div>
        </div>
      </div>
      </SidebarInset>
      </>
  )
}
