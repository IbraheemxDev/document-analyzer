import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const content = formData.get("content") as string;
    const clerkOrgId = formData.get("organizationId") as string;
    const file = formData.get("file") as File;

    if (!name || !clerkOrgId) {
      throw new ApiError(400, "Name and organization ID are required");
    }

    // 3. Resolve organization using its Clerk ID → internal DB record
    const organization = await prisma.organization.findUnique({
      where: { clerkOrgId },
    });

    if (!organization) {
      throw new ApiError(404, `Organization not found for Clerk ID: ${clerkOrgId}`);
    }

    // 4. Fetch user and check they belong to this organization
    // (membership filtered by organization.id — the internal DB id, not the Clerk id)
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        memberships: {
          where: { organizationId: organization.id },
          include: { organization: true },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw new ApiError(
        403,
        "You do not have access to this organization"
      );
    }

    let fileUrl: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;
    let extractedContent = content;

    // 5. Upload file to Vercel Blob if one was provided
    if (file && file.size > 0) {
      const blob = await uploadToBlob(file, clerkOrgId, userId);
      fileUrl = blob.url;
      fileSize = file.size;
      fileType = file.type;

      // If no text content was manually provided but the file is text-based,
      // extract its content automatically for storage/analysis
      if (!extractedContent && file.type.includes("text")) {
        extractedContent = await file.text();
      }
    }

    // 6. Create the document record using internal DB ids for relations
    const document = await prisma.document.create({
      data: {
        name,
        content: extractedContent || null,
        fileUrl,
        fileSize: fileSize || 0,
        fileType: fileType || "unknown",
        organizationId: organization.id,
        userId: user.id,
        aiKeywords: [],
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        organization: {
          select: { name: true, clerkOrgId: true },
        },
      },
    });

    // 7. Return success response
    return NextResponse.json(
      new ApiResponse(
        201,
        {
          document: {
            id: document.id,
            name: document.name,
            fileUrl: document.fileUrl,
            organization: document.organization.name,
            clerkOrgId: document.organization.clerkOrgId,
            uploadedBy: document.user.name,
          },
        },
        "Document uploaded successfully"
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to upload document" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Read organization id from query params
    const { searchParams } = new URL(request.url);
    const clerkOrgId = searchParams.get("organizationId");

    if (!clerkOrgId) {
      throw new ApiError(400, "Organization ID is required");
    }

    // 3. Resolve organization
    const organization = await prisma.organization.findUnique({
      where: { clerkOrgId },
    });

    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    // 4. Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        memberships: {
          where: { organizationId: organization.id },
          include: { organization: true },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw new ApiError(403, "You do not have access to this organization");
    }

    // 5. Fetch all documents belonging to this organization
    const documents = await prisma.document.findMany({
      where: { organizationId: organization.id },
      include: {
        user: {
          select: { name: true, email: true },
        },
        organization: {
          select: { name: true, clerkOrgId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 6. Return success response
    return NextResponse.json(
      new ApiResponse(
        200,
        {
          documents,
          metadata: {
            organization: organization.name,
            clerkOrgId: organization.clerkOrgId,
            documentCount: documents.length,
          },
        },
        "Documents fetched successfully"
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error("Get documents error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to get documents" },
      { status: 500 }
    );
  }
}