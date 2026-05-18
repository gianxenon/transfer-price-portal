 
import {
  SidebarInset 
} from "@/components/ui/sidebar"
import { TpList } from "@/src/app/features/auth/dashboard/tp-list/tp-list" 

export default function TPList() {
  return ( 
     <>
     <SidebarInset> 
       <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 md:gap-6 "> 
             <TpList/>
          </div>
        </div>
      </div>
      </SidebarInset>
      </>
  )
}
