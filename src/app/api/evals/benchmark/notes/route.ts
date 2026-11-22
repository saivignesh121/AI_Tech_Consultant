import { NextRequest, NextResponse } from "next/server";
import {
  saveReviewerNote,
  getReviewerNote,
  getAllReviewerNotes,
  getNotesByModel,
  getNotesByCase,
  deleteReviewerNote,
} from "@/services/eval/reviewerNotes";

/**
 * Task 4.2 Human Reviewer Notes API
 * "For each case and each model, the human reviewer can add a note (what was good, what was wrong)."
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");
    const modelId = searchParams.get("modelId");

    if (caseId && modelId) {
      const note = getReviewerNote(caseId, modelId);
      return NextResponse.json({ success: true, note });
    }

    if (caseId) {
      const notes = getNotesByCase(caseId);
      return NextResponse.json({ success: true, notes, count: notes.length });
    }

    if (modelId) {
      const notes = getNotesByModel(modelId);
      return NextResponse.json({ success: true, notes, count: notes.length });
    }

    const allNotes = getAllReviewerNotes();
    return NextResponse.json({
      success: true,
      notes: allNotes,
      count: allNotes.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve reviewer notes", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, modelId, whatWasGood, whatWasWrong, generalNote, reviewer } = body;

    if (!caseId || !modelId) {
      return NextResponse.json(
        { error: "caseId and modelId are required parameters" },
        { status: 400 }
      );
    }

    if (typeof whatWasGood !== "string" || typeof whatWasWrong !== "string") {
      return NextResponse.json(
        { error: "whatWasGood and whatWasWrong text fields are required" },
        { status: 400 }
      );
    }

    const note = saveReviewerNote({
      caseId,
      modelId,
      whatWasGood,
      whatWasWrong,
      generalNote,
      reviewer,
    });

    return NextResponse.json({
      success: true,
      message: "Human reviewer note saved successfully",
      note,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save reviewer note", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");
    const modelId = searchParams.get("modelId");

    if (!caseId || !modelId) {
      return NextResponse.json(
        { error: "caseId and modelId are required to delete a note" },
        { status: 400 }
      );
    }

    const deleted = deleteReviewerNote(caseId, modelId);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete reviewer note", details: String(error) },
      { status: 500 }
    );
  }
}
