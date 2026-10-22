"use client";

import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

export default function DriverRequestsPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Pending ride requests load karein
  async function loadRides() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/rides/pending`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Rides load nahi ho sakin.");
      }

      setRides(Array.isArray(data.rides) ? data.rides : []);
    } catch (err) {
      setError(err.message || "Backend se connect nahi ho paya.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRides();
  }, []);

  // Ride accept ya reject karein
  async function handleRideAction(rideId, action) {
    try {
      setProcessingId(rideId);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/rides/${rideId}/${action}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Ride update nahi ho payi.");
      }

      setMessage(
        action === "accept"
          ? "✅ Ride successfully accept ho gayi!"
          : "Ride request reject kar di gayi."
      );

      await loadRides();
    } catch (err) {
      setError(err.message || "Action complete nahi ho paya.");
    } finally {
      setProcessingId(null);
    }
  }

  // Currency format
  function formatFare(fare) {
    const amount = Number(fare);

    if (!Number.isFinite(amount)) {
      return "N/A";
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
              RideGo Driver Panel
            </p>

            <h1 className="text-3xl font-extrabold sm:text-4xl">
              🚖 Ride Requests
            </h1>

            <p className="mt-3 text-slate-300">
              Nayi ride requests dekhein aur apni ride select karein.
            </p>
          </div>

          <button
            onClick={loadRides}
            disabled={loading}
            className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh Requests"}
          </button>
        </div>

        {/* Summary */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-slate-300">Pending Requests</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">
              {rides.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-slate-300">Available Action</p>
            <p className="mt-2 text-xl font-bold text-green-300">
              Accept / Reject
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-slate-300">Platform</p>
            <p className="mt-2 text-xl font-bold text-purple-300">
              RideGo 🚘
            </p>
          </div>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-400/30 bg-green-500/15 p-4 text-green-200">
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/15 p-4 text-red-200">
            <p className="font-semibold">⚠️ {error}</p>

            <p className="mt-2 text-sm">
              Check karein ki backend server port 5000 par chal raha hai.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
            <p className="text-slate-300">Ride requests load ho rahi hain...</p>
          </div>
        ) : rides.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-16 text-center backdrop-blur">
            <div className="mb-5 text-6xl">🚘</div>

            <h2 className="text-2xl font-bold">
              Abhi koi pending ride nahi hai
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-slate-300">
              Jab customer ride book karega, aur backend use pending request
              ke roop mein return karega, tab request yahan dikhegi.
            </p>

            <button
              onClick={loadRides}
              className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 font-bold transition hover:bg-indigo-400"
            >
              Check Again
            </button>
          </div>
        ) : (
          /* Ride Cards */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-xl shadow-black/20 backdrop-blur"
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-5">
                  <div>
                    <p className="text-sm text-slate-300">Ride ID</p>
                    <p className="mt-1 font-semibold">
                      #{String(ride.id).slice(0, 8)}
                    </p>
                  </div>

                  <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-200">
                    {ride.status || "requested"}
                  </span>
                </div>

                <div className="p-6">
                  {/* Route */}
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-400/15 text-xl">
                        📍
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Pickup Location</p>
                        <p className="mt-1 font-semibold">
                          {ride.pickup_location || "Pickup not available"}
                        </p>
                      </div>
                    </div>

                    <div className="ml-5 h-6 border-l-2 border-dashed border-slate-500" />

                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-400/15 text-xl">
                        🏁
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">
                          Destination
                        </p>
                        <p className="mt-1 font-semibold">
                          {ride.drop_location || "Destination not available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fare and Date */}
                  <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl bg-slate-950/40 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-400">Estimated Fare</p>
                      <p className="mt-1 text-2xl font-extrabold text-green-300">
                        {formatFare(ride.estimated_fare)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400">Ride Date</p>
                      <p className="mt-2 font-semibold">
                        {ride.ride_date
                          ? new Date(ride.ride_date).toLocaleString("en-IN")
                          : "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => handleRideAction(ride.id, "accept")}
                      disabled={processingId !== null}
                      className="rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-green-500/20 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === ride.id
                        ? "Processing..."
                        : "✓ Accept Ride"}
                    </button>

                    <button
                      onClick={() => handleRideAction(ride.id, "decline")}
                      disabled={processingId !== null}
                      className="rounded-xl border border-red-400/30 bg-red-500/15 px-5 py-3 font-bold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === ride.id
                        ? "Processing..."
                        : "✕ Reject Ride"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-slate-400">
          RideGo • Driver Ride Management
        </p>
      </div>
    </main>
  );
}