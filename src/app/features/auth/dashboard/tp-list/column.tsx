 
import type { ColumnDef } from "@tanstack/react-table"

export type TpRow = {
  companyName: string
  effectivityDate: string
  businessCenter: string
  productName: string
  uom: string
  price: number 
}

export const columns: ColumnDef<TpRow>[] = [
  {
    accessorKey: "companyName",
    header: "Company Name",
  },
  {
    accessorKey: "effectivityDate",
    header: "Effectivity Date",
  },
  {
    accessorKey: "businessCenter",
    header: "Business Center",
  }  ,
  {
    accessorKey: "productName",
    header: "Product Name",
  }, 
  {
    accessorKey: "uom",
    header: "Sales UOM",
  },
  {
    accessorKey: "price",
    header: "Price",
  } 
]
