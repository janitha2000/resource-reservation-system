
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid reservation ID." },
        { status: 400 }
      );
    }

    const cancelled = await sql`
      UPDATE reservations
      SET status = 'CANCELLED'
      WHERE id = ${id}
        AND status = 'CONFIRMED'
      RETURNING id, status
    `;

    if (cancelled.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation not found or already cancelled.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reservation cancelled successfully.",
      reservation: cancelled[0],
    });
  } catch (error) {
    console.error("Failed to cancel reservation:", error);
    return NextResponse.json(
      { success: false, message: "Failed to cancel reservation." },
      { status: 500 }
    );
  }
}
