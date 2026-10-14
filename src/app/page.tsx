
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./globals.css";

type Resource = {
  id: number;
  name: string;
  resource_type: string;
  location: string;
  capacity: number;
  description: string | null;
};

type Reservation = {
  id: number;
  resource_id: number;
  reserver_name: string;
  reserver_email: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  resource_name: string;
  resource_location: string;
};

type ReservationForm = {
  resource_id: string;
  title: string;
  reserver_name: string;
  reserver_email: string;
  start_time: string;
  end_time: string;
};

const emptyForm: ReservationForm = {
  resource_id: "",
  title: "",
  reserver_name: "",
  reserver_email: "",
  start_time: "",
  end_time: "",
};

function getLocalDateTimeValue(date: Date) {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getResourceImage(resource: Resource) {
  const name = resource.name.toLowerCase();
  const type = resource.resource_type.toLowerCase();

  if (name.includes("projector") || type.includes("equipment")) {
    return "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1000&q=85";
  }

  if (name.includes("conference room b")) {
    return "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=85";
  }

  return "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85";
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [form, setForm] = useState<ReservationForm>(emptyForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [minimumDateTime, setMinimumDateTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const updateMinimumDateTime = () => {
      setMinimumDateTime(getLocalDateTimeValue(new Date()));
    };

    updateMinimumDateTime();

    const intervalId = window.setInterval(
      updateMinimumDateTime,
      60_000
    );

    return () => window.clearInterval(intervalId);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [resourcesResponse, reservationsResponse] = await Promise.all([
        fetch("/api/resources", { cache: "no-store" }),
        fetch("/api/reservations", { cache: "no-store" }),
      ]);

      const resourcesData = await resourcesResponse.json();
      const reservationsData = await reservationsResponse.json();

      if (!resourcesResponse.ok) {
        throw new Error(resourcesData.error || "Could not load resources.");
      }

      if (!reservationsResponse.ok) {
        throw new Error(
          reservationsData.error || "Could not load reservations."
        );
      }

      setResources(
        Array.isArray(resourcesData.resources) ? resourcesData.resources : []
      );

      setReservations(
        Array.isArray(reservationsData.reservations)
          ? reservationsData.reservations
          : []
      );
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not load data.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resourceTypes = useMemo(
    () =>
      Array.from(
        new Set(resources.map((resource) => resource.resource_type))
      ).sort(),
    [resources]
  );

  const filteredResources = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return resources.filter((resource) => {
      const searchableText = [
        resource.name,
        resource.resource_type,
        resource.location,
        resource.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(query);
      const matchesType =
        resourceTypeFilter === "ALL" ||
        resource.resource_type === resourceTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [resources, searchTerm, resourceTypeFilter]);

  const filteredReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          statusFilter === "ALL" ||
          reservation.status.toUpperCase() === statusFilter
      ),
    [reservations, statusFilter]
  );

  const confirmedCount = reservations.filter(
    (reservation) => reservation.status.toUpperCase() === "CONFIRMED"
  ).length;

  const cancelledCount = reservations.filter(
    (reservation) => reservation.status.toUpperCase() === "CANCELLED"
  ).length;

  function updateForm(field: keyof ReservationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (
      !form.resource_id ||
      !form.title.trim() ||
      !form.reserver_name.trim() ||
      !form.reserver_email.trim() ||
      !form.start_time ||
      !form.end_time
    ) {
      setNotice({ type: "error", message: "Please complete all required fields." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reserver_email.trim())) {
      setNotice({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    const startDate = new Date(form.start_time);
    const endDate = new Date(form.end_time);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setNotice({ type: "error", message: "Please enter valid dates and times." });
      return;
    }

    if (startDate.getTime() < Date.now() - 60_000) {
      setNotice({
        type: "error",
        message: "You cannot create a reservation in the past.",
      });
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setNotice({
        type: "error",
        message: "End time must be later than start time.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_id: Number(form.resource_id),
          title: form.title.trim(),
          reserver_name: form.reserver_name.trim(),
          reserver_email: form.reserver_email.trim(),
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (response.status === 409
              ? "This resource is already booked for that time."
              : "Could not create the reservation.")
        );
      }

      setNotice({
        type: "success",
        message: "Reservation created successfully!",
      });

      setForm(emptyForm);
      await loadData();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not create the reservation.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(reservation: Reservation) {
    if (reservation.status.toUpperCase() !== "CONFIRMED") return;

    if (!window.confirm(`Cancel the reservation "${reservation.title}"?`)) {
      return;
    }

    setNotice(null);
    setCancellingId(reservation.id);

    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not cancel this reservation.");
      }

      setNotice({
        type: "success",
        message: "Reservation cancelled successfully.",
      });

      await loadData();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not cancel the reservation.",
      });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="ReserveSpace home">
          <span className="brand-mark">R</span>
          <span>
            <strong>ReserveSpace</strong>
            <small>Resource management</small>
          </span>
        </a>

        <nav className="top-nav" aria-label="Main navigation">
          <a href="#resources">Resources</a>
          <a href="#book">Make a booking</a>
          <a href="#reservations">Reservations</a>
        </nav>

        <a className="nav-cta" href="#book">
          <span>+</span> New reservation
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            SMART RESOURCE BOOKING
          </span>

          <h1>
            Make space for
            <br />
            <span>great work.</span>
          </h1>

          <p>
            Find the right space, reserve the resources you need, and manage
            every booking from one simple dashboard.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#book">
              Book a resource <span>↗</span>
            </a>
            <a className="secondary-button" href="#resources">
              Explore resources
            </a>
          </div>

          <div className="hero-note">
            <span className="online-indicator" />
            Simple scheduling. Clear availability. Fewer conflicts.
          </div>
        </div>

        <div className="hero-art" aria-label="Workspace illustration">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />

          <div className="art-card art-card-main">
            <div className="art-card-top">
              <span className="art-window-dots">● ● ●</span>
              <span className="art-calendar-icon">▦</span>
            </div>
            <div className="art-calendar-title">Your workspace</div>
            <div className="art-calendar-subtitle">Plan a better day</div>

            <div className="art-calendar-grid">
              {["M", "T", "W", "T", "F"].map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
              {Array.from({ length: 15 }, (_, index) => (
                <span
                  className={[2, 6, 9, 12].includes(index) ? "date-selected" : ""}
                  key={index}
                >
                  {index + 1}
                </span>
              ))}
            </div>

            <div className="art-confirmed">
              <span className="art-check">✓</span>
              <span>
                <strong>Workspace reserved</strong>
                <small>Everything is in place</small>
              </span>
            </div>
          </div>

          <div className="floating-tag tag-top">
            <span className="tag-icon">✓</span>
            Booking confirmed
          </div>

          <div className="floating-tag tag-bottom">
            <span className="tag-icon tag-icon-green">⌂</span>
            <span>
              <strong>One simple place</strong>
              <small>Manage your bookings</small>
            </span>
          </div>

          <span className="art-spark spark-one">✳</span>
          <span className="art-spark spark-two">✦</span>
        </div>
      </section>

      {notice && (
        <div
          className={`notice notice-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <span className="notice-icon">
            {notice.type === "success" ? "✓" : "!"}
          </span>
          <span>{notice.message}</span>
          <button
            className="notice-dismiss"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      <section className="stats-grid" aria-label="Reservation statistics">
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total resources</span>
            <span className="stat-icon stat-icon-cream">⌂</span>
          </div>
          <strong className="stat-value">
            {loading ? "—" : String(resources.length).padStart(2, "0")}
          </strong>
          <span className="stat-description">Resources listed in the system</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total reservations</span>
            <span className="stat-icon stat-icon-blue">▦</span>
          </div>
          <strong className="stat-value">
            {loading ? "—" : String(reservations.length).padStart(2, "0")}
          </strong>
          <span className="stat-description">Bookings recorded in the system</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Confirmed bookings</span>
            <span className="stat-icon stat-icon-green">✓</span>
          </div>
          <strong className="stat-value">
            {loading ? "—" : String(confirmedCount).padStart(2, "0")}
          </strong>
          <span className="stat-description">Currently confirmed reservations</span>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Cancelled bookings</span>
            <span className="stat-icon stat-icon-red">↗</span>
          </div>
          <strong className="stat-value">
            {loading ? "—" : String(cancelledCount).padStart(2, "0")}
          </strong>
          <span className="stat-description">Reservations cancelled</span>
        </article>
      </section>

      <section className="section-block" id="resources">
        <div className="section-heading">
          <div>
            <span className="section-kicker">FIND YOUR SPACE</span>
            <h2>Explore resources</h2>
            <p>Choose a room or piece of equipment that fits your needs.</p>
          </div>
          <span className="section-count">
            {filteredResources.length}{" "}
            {filteredResources.length === 1 ? "resource" : "resources"}
          </span>
        </div>

        <div className="resource-filters">
          <label className="search-field">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search name, location or description..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search resources"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          <label className="filter-field">
            <span>Resource type</span>
            <select
              value={resourceTypeFilter}
              onChange={(event) => setResourceTypeFilter(event.target.value)}
              aria-label="Filter by resource type"
            >
              <option value="ALL">All types</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="empty-state">
            <span className="loading-spinner" />
            <strong>Loading resources...</strong>
            <p>Please wait while we retrieve the latest information.</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">⌕</span>
            <strong>No resources found</strong>
            <p>Try another search term or select a different resource type.</p>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setSearchTerm("");
                setResourceTypeFilter("ALL");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="resource-grid">
            {filteredResources.map((resource, index) => (
              <article className="resource-card" key={resource.id}>
                <div className="resource-photo">
                  <img
                    src={getResourceImage(resource)}
                    alt={resource.name}
                    loading="lazy"
                  />
                  <span className="photo-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="photo-type">{resource.resource_type}</span>
                </div>

                <div className="resource-info">
                  <div className="resource-title-row">
                    <h3>{resource.name}</h3>
                    <span className="resource-status"><span /> Active</span>
                  </div>

                  <p className="resource-description">
                    {resource.description || "Ready for your next booking."}
                  </p>

                  <div className="resource-meta">
                    <span><span className="meta-icon">⌖</span>{resource.location || "Location not specified"}</span>
                    <span><span className="meta-icon">♙</span>Capacity: {resource.capacity}</span>
                  </div>

                  <button
                    className="resource-book-button"
                    type="button"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        resource_id: String(resource.id),
                      }));
                      document.getElementById("book")?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                  >
                    Reserve this resource <span>↗</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="booking-section" id="book">
        <div className="booking-intro">
          <span className="section-kicker">MAKE IT OFFICIAL</span>
          <h2>Book your next space.</h2>
          <p>
            Complete the details below to create a reservation. The system
            checks for overlapping confirmed bookings.
          </p>

          <div className="booking-benefit">
            <span>✓</span>
            <div>
              <strong>Conflict-aware booking</strong>
              <p>Existing confirmed reservations are checked by the API.</p>
            </div>
          </div>

          <div className="booking-benefit">
            <span>✓</span>
            <div>
              <strong>Easy cancellation</strong>
              <p>Cancel a confirmed reservation from your booking list.</p>
            </div>
          </div>
        </div>

        <form className="booking-form" onSubmit={handleBooking}>
          <div className="form-heading">
            <div>
              <span className="form-step">RESERVATION DETAILS</span>
              <h3>Create a reservation</h3>
            </div>
            <span className="required-note">* Required</span>
          </div>

          <div className="form-field">
            <label htmlFor="resource_id">Select resource *</label>
            <select
              id="resource_id"
              value={form.resource_id}
              onChange={(event) => updateForm("resource_id", event.target.value)}
              required
            >
              <option value="">Choose a resource</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} — {resource.location}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="title">Reservation title *</label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Project planning meeting"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              maxLength={150}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="reserver_name">Your name *</label>
              <input
                id="reserver_name"
                type="text"
                placeholder="Full name"
                value={form.reserver_name}
                onChange={(event) => updateForm("reserver_name", event.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="reserver_email">Email address *</label>
              <input
                id="reserver_email"
                type="email"
                placeholder="you@example.com"
                value={form.reserver_email}
                onChange={(event) => updateForm("reserver_email", event.target.value)}
                maxLength={254}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="start_time">Start date & time *</label>
              <input
                id="start_time"
                type="datetime-local"
                min={minimumDateTime || undefined}
                value={form.start_time}
                onChange={(event) => updateForm("start_time", event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="end_time">End date & time *</label>
              <input
                id="end_time"
                type="datetime-local"
                min={form.start_time || minimumDateTime || undefined}
                value={form.end_time}
                onChange={(event) => updateForm("end_time", event.target.value)}
                required
              />
            </div>
          </div>

          <p className="form-help">
            Select a future time. End time must be later than start time.
            Availability is verified when you submit.
          </p>

          <button
            className="submit-button"
            type="submit"
            disabled={submitting || loading || resources.length === 0}
          >
            {submitting ? (
              <><span className="button-spinner" /> Creating reservation...</>
            ) : (
              <>Confirm reservation <span>↗</span></>
            )}
          </button>

          <p className="form-privacy">
            Please make sure your reservation details are correct.
          </p>
        </form>
      </section>

      <section className="section-block reservations-section" id="reservations">
        <div className="section-heading">
          <div>
            <span className="section-kicker">YOUR SCHEDULE</span>
            <h2>Reservations</h2>
            <p>Review bookings and cancel confirmed reservations when needed.</p>
          </div>

          <label className="reservation-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter reservations by status"
            >
              <option value="ALL">All statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="empty-state compact-empty">
            <span className="loading-spinner" />
            <strong>Loading reservations...</strong>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="empty-state compact-empty">
            <span className="empty-icon">▦</span>
            <strong>No reservations to show</strong>
            <p>Create a reservation or change the status filter.</p>
          </div>
        ) : (
          <div className="reservation-list">
            {filteredReservations.map((reservation) => {
              const isConfirmed =
                reservation.status.toUpperCase() === "CONFIRMED";

              return (
                <article className="reservation-row" key={reservation.id}>
                  <div className="reservation-date-icon">▦</div>

                  <div className="reservation-main">
                    <div className="reservation-title-row">
                      <h3>{reservation.title}</h3>
                      <span className={`status-badge ${isConfirmed ? "status-confirmed" : "status-cancelled"}`}>
                        <span />
                        {reservation.status}
                      </span>
                    </div>

                    <p className="reservation-resource">
                      {reservation.resource_name || "Resource"}
                      {reservation.resource_location
                        ? ` · ${reservation.resource_location}`
                        : ""}
                    </p>

                    <div className="reservation-details">
                      <span><span className="meta-icon">◷</span>{formatDateTime(reservation.start_time)}</span>
                      <span><span className="meta-icon">→</span>{formatDateTime(reservation.end_time)}</span>
                    </div>

                    <p className="reservation-owner">
                      Reserved by {reservation.reserver_name} · {reservation.reserver_email}
                    </p>
                  </div>

                  {isConfirmed && (
                    <button
                      className="cancel-button"
                      type="button"
                      disabled={cancellingId === reservation.id}
                      onClick={() => void handleCancel(reservation)}
                    >
                      {cancellingId === reservation.id ? "Cancelling..." : "Cancel booking"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="footer">
        <a className="footer-brand" href="#">
          <span className="brand-mark">R</span>
          <strong>ReserveSpace</strong>
        </a>
        <p>Thoughtful spaces. Better work.</p>
        <span>Resource Reservation Management System</span>
      </footer>
    </main>
  );
}
