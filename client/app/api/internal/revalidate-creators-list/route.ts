import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST() {
  revalidateTag("creators-list", "max");
  revalidatePath("/brand/creators", "page");

  return NextResponse.json({ ok: true });
}
