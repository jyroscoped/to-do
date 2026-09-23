import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "officeops-progress.json");

type ProgressState = {
  tasks: unknown[];
  timeEntries: unknown[];
  activeTimer: unknown | null;
  sheetUrl: string;
};

const emptyState: ProgressState = {
  tasks: [],
  timeEntries: [],
  activeTimer: null,
  sheetUrl: "",
};

async function readState(): Promise<ProgressState> {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      timeEntries: Array.isArray(parsed.timeEntries) ? parsed.timeEntries : [],
      activeTimer: parsed.activeTimer ?? null,
      sheetUrl: typeof parsed.sheetUrl === "string" ? parsed.sheetUrl : "",
    };
  } catch {
    return emptyState;
  }
}

async function writeState(state: ProgressState) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(state, null, 2), "utf8");
}

export async function GET() {
  return NextResponse.json(await readState());
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid payload" } },
      { status: 400 },
    );
  }
  const nextState: ProgressState = {
    tasks: Array.isArray(body.tasks) ? body.tasks : [],
    timeEntries: Array.isArray(body.timeEntries) ? body.timeEntries : [],
    activeTimer: body.activeTimer ?? null,
    sheetUrl: typeof body.sheetUrl === "string" ? body.sheetUrl : "",
  };
  await writeState(nextState);
  return NextResponse.json({ ok: true });
}
