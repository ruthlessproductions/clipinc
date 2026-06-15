import { NextResponse } from "next/server";
import { getProjects } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getProjects());
}
