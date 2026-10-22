"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://localhost:5000";

const DRIVER_ID = "0032e29e-856b-4561-b221-04cb59072a7f";

export default function DriverDashboardPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    totalRides: 0,
    completedRidesCount: 0,
    totalEarnings: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);
  const [recentRides, setRecentRides] = useState([]);
  const [recentRidesLoading, setRecentRidesLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const token = localStorage.getItem("ridego_token");

        if (!token) {
          throw new Error("Token nahi mila. Dobara login karein.");
        }

        // 1. Load Driver Profile
        const response = await fetch(
          `${API_URL}/api/drivers/${DRIVER_ID}/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(
            result.message || "Driver profile load nahi hua."
          );
        }

        const result = await response.json();
        const driver = result.driver ?? result.data ?? result;

        setIsOnline(
          driver.is_online === true ||
            driver.isOnline === true ||
            driver.status === "online"
        );

        // 2. Load Ride Statistics and Recent Rides
        const statsResponse = await fetch(
          `${API_URL}/api/rides/driver/${DRIVER_ID}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();

          setStats({
            totalRides: statsResult.stats?.totalRides ?? 0,
            completedRidesCount:
              statsResult.stats?.completedRidesCount ?? 0,
            totalEarnings: Number(
              statsResult.stats?.totalEarnings ?? 0
            ),
          });

          setRecentRides((statsResult.rides ?? []).slice(0, 3));
        } else {
          console.error(
            "Ride statistics load failed:",
            statsResponse.status
          );
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(err.message || "Status load nahi hua. Backend check karein.");
      } finally {
        setLoading(false);
        setStatsLoading(false);
        setRecentRidesLoading(false);
      }
    }

    loadStatus();
  }, []);

  // 3. Change Driver Availability
  async function toggleAvailability() {
    setUpdating(true);
    setMessage("");
    setError("");

    const nextStatus = !isOnline;

    try {
      const token = localStorage.getItem("ridego_token");

      if (!token) {
        throw new Error("Token nahi mila. Dobara login karein.");
      }

      const response = await fetch(
        `${API_URL}/api/drivers/${DRIVER_ID}/availability`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_online: nextStatus,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Availability update nahi hui."
        );
      }

      setIsOnline(nextStatus);
      setMessage(
        nextStatus
          ? "You are online and ready for rides!"
          : "You are now offline."
      );
    } catch (err) {
      console.error("Availability update error:", err);
      setError(err.message || "Status update nahi hua.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px 20px",
        background: "#f1f5f9",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderRadius: "16px",
            background: "linear-gradient(120deg, #111827, #2563eb)",
            marginBottom: "28px",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#ffffff",
              textDecoration: "none",
            }}
          >
            🚕 RideGo
          </Link>

          <Link
            href="/driver/profile"
            style={{
              padding: "11px 16px",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#1d4ed8",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Driver Profile
          </Link>
        </nav>

        <section
          style={{
            padding: "30px",
            borderRadius: "20px",
            background: "linear-gradient(120deg, #2563eb, #7c3aed)",
            color: "#ffffff",
            marginBottom: "25px",
          }}
        >
          <h1 style={{ fontSize: "34px", marginTop: 0 }}>
            Welcome to RideGo! 👋
          </h1>
          <p style={{ lineHeight: 1.7 }}>
            Manage your availability and get ready for your next ride.
          </p>
        </section>

        {/* Ride Statistics */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "18px",
            marginBottom: "25px",
          }}
        >
          <StatCard
            title="🚕 Total Rides"
            value={statsLoading ? "..." : stats.totalRides}
          />

          <StatCard
            title="✅ Completed Rides"
            value={
              statsLoading ? "..." : stats.completedRidesCount
            }
          />

          <StatCard
            title="💰 Total Earnings"
            value={
              statsLoading
                ? "..."
                : `₹${Number(stats.totalEarnings).toLocaleString("en-IN")}`
            }
          />
        </section>

        {/* Availability and Profile */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "22px",
          }}
        >
          <section
            style={{
              padding: "25px",
              background: "#ffffff",
              borderRadius: "18px",
              border: `1px solid ${isOnline ? "#6ee7b7" : "#fca5a5"}`,
              boxShadow: "0 5px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2>🟢 Driver Availability</h2>

            <h3 style={{ color: isOnline ? "#059669" : "#dc2626" }}>
              {loading ? "Loading..." : isOnline ? "ONLINE" : "OFFLINE"}
            </h3>

            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              {isOnline
                ? "You are available for rides."
                : "Go online when you are ready for rides."}
            </p>

            <button
              onClick={toggleAvailability}
              disabled={loading || updating}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "10px",
                background: isOnline ? "#dc2626" : "#059669",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: loading || updating ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? "Please wait..."
                : updating
                ? "Updating..."
                : isOnline
                ? "Go Offline"
                : "Go Online"}
            </button>
          </section>

          <section
            style={{
              padding: "25px",
              background: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #bfdbfe",
              boxShadow: "0 5px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2>👤 Driver Profile</h2>
            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              Update your personal information, vehicle details, and
              driving licence information.
            </p>

            <ActionLink href="/driver/profile">
              Manage Profile →
            </ActionLink>

            <ActionLink href="/driver/requests">
              🚖 View Ride Requests →
            </ActionLink>

            <ActionLink href="/driver/history">
              📋 View Ride History →
            </ActionLink>
          </section>
        </div>

        {/* Recent Rides */}
        <section
          style={{
            background: "#ffffff",
            padding: "25px",
            borderRadius: "18px",
            marginTop: "25px",
            marginBottom: "25px",
            boxShadow: "0 5px 18px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h2>🚕 Recent Rides</h2>
            <Link
              href="/driver/history"
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              View All →
            </Link>
          </div>

          {recentRidesLoading ? (
            <p>Loading recent rides...</p>
          ) : recentRides.length === 0 ? (
            <p style={{ color: "#64748b" }}>No rides found.</p>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {recentRides.map((ride) => (
                <div
                  key={ride.id}
                  style={{
                    padding: "18px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                >
                  <p>
                    <strong>Pickup:</strong>{" "}
                    {ride.pickup_location ||
                      ride.pickup_address ||
                      "N/A"}
                  </p>

                  <p>
                    <strong>Drop:</strong>{" "}
                    {ride.drop_location ||
                      ride.destination_location ||
                      ride.drop_address ||
                      "N/A"}
                  </p>

                  <p>
                    <strong>Fare:</strong>{" "}
                      ₹
                      {Number(
                        ride.final_fare ??
                        ride.estimated_fare ??
                        ride.fare ??
                        0
                      ).toLocaleString("en-IN")}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {String(ride.status || "unknown").toUpperCase()}
                  </p>

                  <Link
                    href={`/driver/history/${ride.id}`}
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      padding: "10px 15px",
                      borderRadius: "8px",
                      background: "#2563eb",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Messages */}
        {message && (
          <p
            style={{
              padding: "15px",
              marginTop: "22px",
              borderRadius: "10px",
              background: "#d1fae5",
              color: "#065f46",
            }}
          >
            ✅ {message}
          </p>
        )}

        {error && (
          <p
            style={{
              padding: "15px",
              marginTop: "22px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            ⚠️ {error}
          </p>
        )}

        <footer
          style={{
            textAlign: "center",
            padding: "30px 0",
            color: "#64748b",
          }}
        >
          © {new Date().getFullYear()} RideGo Driver Dashboard
        </footer>
      </div>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        padding: "22px",
        borderRadius: "16px",
        boxShadow: "0 5px 18px rgba(15,23,42,0.06)",
      }}
    >
      <h3>{title}</h3>
      <p style={{ fontSize: "30px", fontWeight: "bold" }}>{value}</p>
    </div>
  );
}

function ActionLink({ href, children }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        marginTop: "12px",
        padding: "14px",
        textAlign: "center",
        borderRadius: "10px",
        background: "linear-gradient(120deg, #3b82f6, #4f46e5)",
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: "bold",
      }}
    >
      {children}
    </Link>
  );
}