import { getPool } from "../../infrastructure/db"


export async function GET(request: Request) {
    try {
        const pool = await getPool()
        const url = new URL(request.url)
        const query = (url.searchParams.get("query") || "").trim()
        if (query.length < 2) {
            return new Response(JSON.stringify([]), {
                headers: { "Content-Type": "application/json" }
            })
        }
        const result = await pool.request()
            .input("query", query)
            .query("SELECT TOP 10 id, fullname, emailaddress FROM tpp_emailreceipients WHERE emailaddress LIKE '%' + @query + '%' ORDER BY emailaddress")
        return new Response(JSON.stringify(result.recordset), {
            headers: { "Content-Type": "application/json" }
        })
    } catch {
        return new Response(JSON.stringify({ error: "Failed to fetch email recipients" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        })  
    }   
}
