
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const resources = await sql`
      SELECT
        id,
        name,
        resource_type,
        location,
        capacity,
        description,
        is_active
      FROM resources
      WHERE is_active = TRUE
      ORDER BY id ASC
    `;

    return NextResponse.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error("Failed to fetch resources:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}
