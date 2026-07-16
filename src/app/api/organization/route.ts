import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated via Clerk
    const { userId } = await auth();
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { clerkOrgId, name, slug } = body;

    if (!clerkOrgId || !name) {
      throw new ApiError(400, "clerkOrgId and name are required");
    }

    // 3. Check if organization already exists in our DB
    const existingOrg = await prisma.organization.findUnique({
      where: { clerkOrgId },
    });

    if (existingOrg) {
      // Not an error — just return the existing org (idempotent behaviour)
      return NextResponse.json(
        new ApiResponse(200, { organization: existingOrg }, "Organization already exists"),
        { status: 200 }
      );
    }

    // 4. Find the user in our DB (must already exist, e.g. synced via Clerk webhook)
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found. Please sync your account first.");
    }

    // 5. Create the organization in our DB
    const organization = await prisma.organization.create({
      data: {
        clerkOrgId,
        name,
        // Generate a URL-safe slug if none provided (hyphens, not "=")
        slug: slug || name.toLowerCase().trim().replace(/\s+/g, "-"),
      },
    });

    // 6. Add the creating user as the "owner" member of this organization
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "owner",
      },
    });

    // 7. Return success response with the newly created organization
    return NextResponse.json(
      new ApiResponse(201, { organization }, "Organization created successfully"),
      { status: 201 }
    );
  } catch (error) {
    console.error("Create organization error:", error);

    // If it's a known ApiError, return its specific status + message
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: error.statusCode }
      );
    }

    // Fallback for unexpected errors
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}