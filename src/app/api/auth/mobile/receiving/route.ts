import "server-only"
import { NextResponse } from "next/server"
import { getMobileSessionUser, unauthorizedResponse } from "../mobile-auth"
import {
  ReceivingValidationError,
  saveReceiving,
} from "@/src/app/infrastructure/db/coldstorage/receiving-repo"

export async function POST(req: Request) {
  try {
    const sessionUser = await getMobileSessionUser(req)
    if (!sessionUser) return unauthorizedResponse()

    const body = await req.json()
    const receiving = Array.isArray(body?.receiving) ? body.receiving : []

    if (!receiving.length) {
      return NextResponse.json(
        { ok: false, message: "No receiving items to submit." },
        { status: 400 }
      )
    }

    const result = await saveReceiving({
      items: receiving,
      username: sessionUser.user.UserName ?? "",
      fullName: sessionUser.user.UsersFullName ?? "",
    })

    return NextResponse.json({
      ok: true,
      message: "Receiving submitted successfully.",
      inventoryReceivingId: result.inventoryReceivingId,
      count: result.count,
    })
  } catch (error) {
    if (error instanceof ReceivingValidationError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { ok: false, message: "Unable to submit receiving." },
      { status: 500 }
    )
  }
}
