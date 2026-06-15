import { NextResponse } from "next/server";
import { getProjects, getClips, mapProject, mapClip } from "@/lib/db";

export async function GET() {
  const projects = getProjects() as Record<string, unknown>[];
  const allClips = getClips() as Record<string, unknown>[];
  const mapped = projects.map((p) =>
    mapProject(p, allClips.filter((c) => c.project_id === p.id).map(mapClip))
  );
  return NextResponse.json(mapped);
}
