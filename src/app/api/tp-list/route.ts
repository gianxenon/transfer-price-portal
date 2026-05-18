import "server-only"
import { getPool } from "../../infrastructure/db" 
import sql from "mssql"
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const effectivityDate = searchParams.get("effectivityDate")?.trim() || ""
  const companyId = Number(searchParams.get("companyId") || 0)

  if (!effectivityDate || !companyId) {
    return Response.json([], { status: 200 })
  }
  try{
    const pool = await getPool()
    const result = await pool.request()
      .input("companyId", sql.Int, companyId)
      .input("effectivityDate", sql.Date, effectivityDate)
      .query("select c.CustomersMotherCompanyName as companyName, tp.effectivity_date as effectivityDate, BusinessCenterUnit.BusinessCenterUnitName as businessCenter, p.ProductsName as productName, tp.uom as uom, tp.Price as price from uploaded_transfer_price tp inner join CustomersMotherCompany c on tp.CustomersMotherCompanyId = c.CustomersMotherCompanyId  inner join Products p on tp.products_id = p.ProductsId inner join BusinessCenterUnit on tp.businessCenterUnitId = BusinessCenterUnit.BusinessCenterUnitId where tp.effectivity_date = @effectivityDate and tp.CustomersMotherCompanyId = @companyId order ")
    return Response.json(result.recordset, { status: 200 })
  }
  catch (error) {
    console.error("Error fetching TP list:", error)
    return Response.json([], { status: 500 })
  }
}
