import { NextRequest, NextResponse } from "next/server";
import { deleteFromBlob } from "@/lib/blob";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { documentId } = await params;
        
    // 1. Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Fetch document along with organization membership info,
    // filtered to only include the membership row for the current user (if any)
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                user: { clerkUserId: userId },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    // 3. If no membership row was found, the user doesn't belong to this org
    if (document.organization.members.length === 0) {
      throw new ApiError(403, "You do not have permission to delete this document");
    }

    // 4. Delete the file from Vercel Blob storage if it exists.
    // We don't fail the whole request if blob deletion fails —
    // better to have an orphaned blob than a document stuck undeletable.
    if (document.fileUrl) {
      try {
        await deleteFromBlob(document.fileUrl);
      } catch (blobError) {
        console.error("Failed to delete from blob:", blobError);
        // Continue with database deletion even if blob deletion fails
      }
    }

    // 5. Delete the document record from the database
    await prisma.document.delete({
      where: { id: documentId },
    });

    // 6. Return success response
    return NextResponse.json(
      new ApiResponse(200, null, "Document deleted successfully"),
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete document error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to delete document" },
      { status: 500 }
    );
  }
}