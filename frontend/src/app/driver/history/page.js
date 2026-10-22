"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://localhost:5000";
const DRIVER_ID = "bf4f91ea-d976-4fad-b6ac-8aea706b1423";

export default function DriverHistoryPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchRideHistory();
  }, []);

  async function fetchRideHistory() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("ridego_token");

const response = await fetch(
  `${API_URL}/api/rides/driver/${DRIVER_ID}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load ride history");
      }

      const rideList = Array.isArray(data)
        ? data
        : data.rides || data.data || [];

      setRides(rideList);
    } catch (err) {
      console.error("Ride history error:", err);
      setError(err.message || "Could not load ride history.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRides = rides.filter((ride) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !search ||
      String(ride.id || ride.ride_id || "")
        .toLowerCase()
        .includes(search) ||
      String(ride.pickup_location || ride.pickup_address || "")
        .toLowerCase()
        .includes(search) ||
      String(ride.drop_location || ride.drop_address || "")
        .toLowerCase()
        .includes(search);

    const dateValue = ride.created_at || ride.createdAt;
    const rideDate = dateValue
      ? new Date(dateValue).toLocaleDateString("en-CA")
      : "";

    const matchesDate = !dateFilter || rideDate === dateFilter;

    const matchesStatus =
      statusFilter === "all" ||
      String(ride.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesDate && matchesStatus;
  });

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusColor(status) {
    const value = String(status || "").toLowerCase();

    if (value === "completed") return "#15803d";

    if (
      value === "accepted" ||
      value === "driver_arriving" ||
      value === "started"
    ) {
      return "#1d4ed8";
    }

    if (value === "cancelled" || value === "declined") {
      return "#b91c1c";
    }

    return "#475569";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "24px",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              🚕 Driver Ride History
            </h1>

            <p style={{ color: "#64748b" }}>
              View your previous and current rides.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={fetchRideHistory}
              disabled={loading}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "white",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>

            <Link
              href="/driver/dashboard"
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                background: "#e2e8f0",
                color: "#0f172a",
                textDecoration: "none",
              }}
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            {error}
            <button
              onClick={fetchRideHistory}
              style={{
                display: "block",
                marginTop: "10px",
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && rides.length > 0 && (
          <section
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "12px",
              marginBottom: "20px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <input
              type="text"
              placeholder="Search pickup, drop or ride ID"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{
                padding: "11px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
              }}
            />

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              style={{
                padding: "11px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
              }}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                padding: "11px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="accepted">Accepted</option>
              <option value="driver_arriving">Driver Arriving</option>
              <option value="started">Started</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
                setStatusFilter("all");
              }}
              style={{
                padding: "11px",
                border: "none",
                borderRadius: "8px",
                background: "#0f172a",
                color: "white",
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </section>
        )}

        {loading ? (
          <p>Loading ride history...</p>
        ) : filteredRides.length === 0 ? (
          <section
            style={{
              background: "white",
              padding: "40px 20px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 2px 8px #0000000d",
            }}
          >
            <div style={{ fontSize: "42px" }}>🚕</div>
            <h2>No Rides Found</h2>

            <p style={{ color: "#64748b" }}>
              {error
                ? "Ride history could not be loaded. Please try again."
                : rides.length > 0
                  ? "No rides match your selected filters."
                  : "Your rides will appear here when the API returns ride records."}
            </p>
          </section>
        ) : (
          <section style={{ display: "grid", gap: "16px" }}>
            {filteredRides.map((ride, index) => {
              const rideId = ride.id || ride.ride_id || index;
              const fare =
                ride.final_fare ??
                ride.estimated_fare ??
                ride.fare ??
                ride.amount ??
                ride.price ??
                0;

              return (
                <article
                  key={rideId}
                  style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px #0000000d",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: "18px" }}>
                      Ride #{String(rideId).slice(0, 8)}
                    </h2>

                    <span
                      style={{
                        background: `${statusColor(ride.status)}15`,
                        color: statusColor(ride.status),
                        padding: "6px 10px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "13px",
                      }}
                    >
                      {String(ride.status || "Unknown")
                        .replaceAll("_", " ")
                        .toUpperCase()}
                    </span>
                  </div>

                  <div style={{ marginTop: "16px", lineHeight: 1.9 }}>
                    <p>
                      <strong>📍 Pickup:</strong>{" "}
                      {ride.pickup_location ||
                        ride.pickup_address ||
                        ride.pickup ||
                        "—"}
                    </p>

                    <p>
                      <strong>🏁 Drop:</strong>{" "}
                      {ride.drop_location ||
                        ride.drop_address ||
                        ride.drop ||
                        "—"}
                    </p>

                    <p>
                      <strong>📅 Booked:</strong>{" "}
                      {formatDate(ride.created_at || ride.createdAt)}
                    </p>

                    <p>
                      <strong>💰 Fare:</strong>{" "}
                      ₹{Number(fare).toLocaleString("en-IN")}
                    </p>

                    {ride.payment_status && (
                      <p>
                        <strong>Payment:</strong>{" "}
                        {String(ride.payment_status).toUpperCase()}
                      </p>
                    )}
                  </div>

                                    <Link
                    href={`/driver/history/${rideId}`}
                    style={{
                      display: "inline-block",
                      marginTop: "12px",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "#2563eb",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    View Details →
                  </Link>

                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}