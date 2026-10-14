
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`
      SELECT NOW() AS current_time,
             current_database() AS database_name
    `;

    return NextResponse.json({
      success: true,
      message: "Database connected successfully",
      database: result[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed. Check DATABASE_URL and server logs.",
      },
      { status: 500 }
    );
  }
}
