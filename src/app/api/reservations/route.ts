
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const reservations = await sql`
      SELECT
        r.id,
        r.resource_id,
        r.reserver_name,
        r.reserver_email,
        r.title,
        r.start_time,
        r.end_time,
        r.status,
        r.created_at,
        res.name AS resource_name,
        res.location AS resource_location
      FROM reservations r
      JOIN resources res ON res.id = r.resource_id
      ORDER BY r.start_time DESC
    `;

    return NextResponse.json({ success: true, reservations });
  } catch (error) {
    console.error("Failed to fetch reservations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const resourceId = Number(body.resource_id);
    const name = String(body.reserver_name ?? "").trim();
    const email = String(body.reserver_email ?? "").trim();
    const title = String(body.title ?? "").trim();
    const start = new Date(body.start_time);
    const end = new Date(body.end_time);

    if (
      !Number.isInteger(resourceId) ||
      resourceId < 1 ||
      !name ||
      !email ||
      !title ||
      name.length > 120 ||
      email.length > 255 ||
      title.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !body.start_time ||
      !body.end_time ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide valid reservation details and times." },
        { status: 400 }
      );
    }

    const created = await sql`
      INSERT INTO reservations (
        resource_id,
        reserver_name,
        reserver_email,
        title,
        start_time,
        end_time
      )
      SELECT
        ${resourceId},
        ${name},
        ${email},
        ${title},
        ${start.toISOString()},
        ${end.toISOString()}
      WHERE EXISTS (
        SELECT 1 FROM resources
        WHERE id = ${resourceId} AND is_active = TRUE
      )
      AND NOT EXISTS (
        SELECT 1 FROM reservations
        WHERE resource_id = ${resourceId}
          AND status = 'CONFIRMED'
          AND start_time < ${end.toISOString()}::timestamptz
          AND end_time > ${start.toISOString()}::timestamptz
      )
      RETURNING *
    `;

    if (created.length === 0) {
      const resource = await sql`
        SELECT id FROM resources
        WHERE id = ${resourceId} AND is_active = TRUE
      `;

      if (resource.length === 0) {
        return NextResponse.json(
          { success: false, message: "Resource not found or inactive." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "This resource is already reserved during the selected time. Please choose another time.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Reservation created successfully.", reservation: created[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create reservation." },
      { status: 500 }
    );
  }
}
