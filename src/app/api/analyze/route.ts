import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { analyzeWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      throw new ApiError(401, "Please sign in");
    }

    // 2. Parse and validate request body
    const { documentId, organizationId, analysisType } = await request.json();
    if (!documentId || !organizationId) {
      throw new ApiError(400, "Missing document or organization ID");
    }

    // 3. Find document — ensures it belongs to the org AND the user is a member of that org
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organization: {
          clerkOrgId: organizationId,
          members: {
            some: {
              user: { clerkUserId: userId },
            },
          },
        },
      },
    });

    if (!document) {
      throw new ApiError(404, "Document not found or no access");
    }

    // 4. Get content to analyze (fallback to document name if no content)
    const content = document.content || document.name;
    if (!content || content.trim().length < 5) {
      throw new ApiError(400, "Document has no content to analyze");
    }

    // 5. Run AI analysis via Gemini
    const summary = await analyzeWithGemini(content, analysisType);

    // 6. Save the analysis result back to the document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        aiSummary: summary,
        aiKeywords: ["analyzed"], // placeholder — replace with real extracted keywords later
        sentiment: "analyzed", // placeholder — replace with real sentiment result later
      },
    });

    // 7. Return success response
    return NextResponse.json(
      new ApiResponse(
        200,
        {
          summary,
          document: {
            id: updatedDocument.id,
            name: updatedDocument.name,
            aiSummary: updatedDocument.aiSummary,
          },
        },
        "Document analyzed successfully"
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error("Analysis error:", error);

    // Known, expected error (auth, validation, not found, etc.)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.statusCode }
      );
    }

    // Unexpected error (e.g. Gemini API failure, DB error)
    return NextResponse.json(
      { success: false, message: "Analysis failed" },
      { status: 500 }
    );
  }
}