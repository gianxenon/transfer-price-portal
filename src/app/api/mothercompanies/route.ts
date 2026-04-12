import { getPool } from "../../infrastructure/db";
 
export async function GET() {
    try {
        const pool = await getPool()
        const result = await pool.request().query("select CustomersMotherCompanyId,CustomersMotherCompanyName from CustomersMotherCompany where isInterCompany = 1")
        return new Response(JSON.stringify(result.recordset), {
            headers: { "Content-Type": "application/json" }
        })
    } catch {
        return new Response(JSON.stringify({ error: "Failed to fetch mother companies" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        })  
    }
}