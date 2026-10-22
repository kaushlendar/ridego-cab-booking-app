"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "http://localhost:5000";
const DRIVER_ID = "bf4f91ea-d976-4fad-b6ac-8aea706b1423";

export default function DriverPage() {
  const [rides, setRides] = useState([]);
  const [pendingRides, setPendingRides] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
const [completedRidesCount, setCompletedRidesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [isOnline, setIsOnline] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

const fetchAvailability = useCallback(async () => {
  try {
    const token = localStorage.getItem("ridego_token");

    if (!token) {
      setError("Please login first.");
      return;
    }

    const response = await fetch(
      `${API_URL}/api/drivers/${DRIVER_ID}/availability`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load availability");
    }

    setIsOnline(data.driver.is_online);
  } catch (err) {
    console.error("Availability error:", err);
    setError(err.message || "Failed to load availability");
  }
}, []);

const toggleAvailability = async () => {
  try {
    setAvailabilityLoading(true);
    setError("");

    const token = localStorage.getItem("ridego_token");

    if (!token) {
      throw new Error("Please login first.");
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
          is_online: !isOnline,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to update availability");
    }

    setIsOnline(data.driver.is_online);
    alert(data.message);
  } catch (err) {
    setError(err.message || "Unable to update availability");
  } finally {
    setAvailabilityLoading(false);
  }
};

  const fetchRides = useCallback(async () => {
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
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch active rides");
      }

      setRides(data.rides || []);
      setTotalEarnings(Number(data.stats?.totalEarnings || 0));
setCompletedRidesCount(
  Number(data.stats?.completedRidesCount || 0)
);

     const pendingResponse = await fetch(
  `${API_URL}/api/rides/pending`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      const pendingData = await pendingResponse.json();

      if (!pendingResponse.ok) {
        throw new Error(
          pendingData.message || "Failed to fetch pending rides"
        );
      }

      setPendingRides(pendingData.rides || []);
    } catch (err) {
      setError(err.message || "Unable to load rides");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();
    fetchAvailability();
  }, [fetchRides, fetchAvailability]);

const handleRideAction = async (rideId, action) => {
  try {
    setActionLoading(rideId);
    setError("");

    const token = localStorage.getItem("ridego_token");

    if (!token) {
      throw new Error("Please login first.");
    }

    const response = await fetch(
      `${API_URL}/api/rides/${rideId}/${action}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Failed to ${action} ride`);
    }

    const messages = {
      accept: "Ride accepted successfully!",
      decline: "Ride declined successfully!",
      arriving: "Driver is arriving!",
      start: "Ride started successfully!",
      complete: "Ride completed successfully!",
    };

    alert(messages[action] || "Ride updated successfully!");

    await fetchRides();
  } catch (err) {
    setError(err.message || `Unable to ${action} ride`);
  } finally {
    setActionLoading(null);
  }
};

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-black px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">RideGo Driver</h1>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleAvailability}
              disabled={availabilityLoading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                isOnline
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50`}
            >
              {availabilityLoading
                ? "Updating..."
                : isOnline
                ? "🟢 Online — Go Offline"
                : "🔴 Offline — Go Online"}
            </button>

            <button
              onClick={() => {
                fetchRides();
                fetchAvailability();
              }}
              disabled={loading || availabilityLoading}
              className="rounded-lg border border-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              Refresh
            </button>

            <a
  href="/driver/profile"
  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
>
  👤 My Profile
</a>

            <a
              href="/"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Home
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
  <div className="rounded-2xl bg-white p-6 shadow">
    <p className="text-sm font-medium text-gray-500">
      Total Earnings
    </p>

    <h2 className="mt-2 text-3xl font-bold text-green-600">
      ₹{totalEarnings.toFixed(2)}
    </h2>

    <p className="mt-2 text-sm text-gray-500">
      Earnings based on completed ride fares
    </p>
  </div>

  <div className="rounded-2xl bg-white p-6 shadow">
    <p className="text-sm font-medium text-gray-500">
      Completed Rides
    </p>

    <h2 className="mt-2 text-3xl font-bold text-blue-600">
      {completedRidesCount}
    </h2>

    <p className="mt-2 text-sm text-gray-500">
      Total completed rides
    </p>
  </div>
</div>
        <div className="mb-8 rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            Driver Availability
          </h2>

          <p className="mt-2 text-gray-600">
            Current status:{" "}
            <span
              className={`font-bold ${
                isOnline ? "text-green-600" : "text-red-600"
              }`}
            >
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1">{error}</p>

            <button
              onClick={() => {
                fetchRides();
                fetchAvailability();
              }}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="mb-12">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">
            🆕 New Ride Requests
          </h2>

          <p className="mb-5 text-gray-600">
            Accept or decline rides requested by customers.
          </p>

          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-center shadow">
              Loading ride requests...
            </div>
          ) : pendingRides.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <div className="text-4xl">🚕</div>

              <p className="mt-3 font-medium text-gray-700">
                No new ride requests available.
              </p>

              <button
                onClick={fetchRides}
                className="mt-4 rounded-lg bg-black px-5 py-2 font-semibold text-white hover:bg-gray-800"
              >
                Refresh Requests
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {pendingRides.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      🚕 New Ride
                    </h3>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                      {ride.status}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-500">
                    📍 Pickup
                  </p>
                  <p className="mb-4 mt-1 font-medium text-gray-900">
                    {ride.pickup_location || "Not provided"}
                  </p>

                  <p className="text-sm font-semibold text-gray-500">
                    🏁 Destination
                  </p>
                  <p className="mb-4 mt-1 font-medium text-gray-900">
                    {ride.drop_location || "Not provided"}
                  </p>

                  <div className="mb-5 rounded-xl bg-gray-100 p-4">
                    <p className="text-sm text-gray-500">Estimated Fare</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      ₹{Number(ride.estimated_fare || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRideAction(ride.id, "accept")}
                      disabled={actionLoading === ride.id || !isOnline}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === ride.id
                        ? "Processing..."
                        : "✓ Accept"}
                    </button>

                    <button
                      onClick={() => handleRideAction(ride.id, "decline")}
                      disabled={actionLoading === ride.id}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === ride.id
                        ? "Processing..."
                        : "✕ Decline"}
                    </button>
                  </div>

                  {!isOnline && (
                    <p className="mt-3 text-sm text-red-600">
                      Accept rides करने के लिए पहले Online हों।
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            My Active Rides
          </h2>
          <p className="mt-2 text-gray-600">
            Manage your assigned customer rides.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow">
            Loading active rides...
          </div>
        ) : rides.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow">
            <div className="text-5xl">🚕</div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              No Active Rides
            </h3>
            <p className="mt-2 text-gray-500">
              You currently have no active rides.
            </p>
            <button
              onClick={fetchRides}
              className="mt-6 rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="rounded-2xl bg-white p-6 shadow-md"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-gray-900">
                    🚕 Ride
                  </h3>
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                    {ride.status}
                  </span>
                </div>

                <div className="mb-5 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Ride ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-gray-800">
                    {ride.id}
                  </p>
                </div>

                <p className="text-sm font-semibold text-gray-500">
                  📍 Pickup
                </p>
                <p className="mb-4 mt-1 font-medium text-gray-900">
                  {ride.pickup_location || "Not provided"}
                </p>

                <p className="text-sm font-semibold text-gray-500">
                  🏁 Destination
                </p>
                <p className="mb-4 mt-1 font-medium text-gray-900">
                  {ride.drop_location || "Not provided"}
                </p>

                <div className="mt-5 rounded-xl bg-gray-100 p-4">
                  <p className="text-sm text-gray-500">Estimated Fare</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    ₹{Number(ride.estimated_fare || 0).toFixed(2)}
                  </p>
                </div>

                <div className="mt-5 border-t pt-5">
                  <p className="text-sm font-semibold text-gray-500">
                    👤 Driver
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {ride.driver_name || "Driver"}
                  </p>
                  <p className="text-sm text-gray-600">
                    📞 {ride.driver_phone || "Not available"}
                  </p>
                  <p className="text-sm text-gray-600">
                    ⭐ {ride.driver_rating ?? "Not rated"}
                  </p>
                </div>

                {ride.status === "accepted" && (
                  <button
                    onClick={() => handleRideAction(ride.id, "arriving")}
                    disabled={actionLoading === ride.id}
                    className="mt-6 w-full rounded-lg bg-black px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {actionLoading === ride.id
                      ? "Updating..."
                      : "🚕 Driver Arriving"}
                  </button>
                )}

                {ride.status === "driver_arriving" && (
                  <button
                    onClick={() => handleRideAction(ride.id, "start")}
                    disabled={actionLoading === ride.id}
                    className="mt-6 w-full rounded-lg bg-black px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {actionLoading === ride.id
                      ? "Updating..."
                      : "🚗 Start Ride"}
                  </button>
                )}

                {ride.status === "started" && (
                  <button
                    onClick={() => handleRideAction(ride.id, "complete")}
                    disabled={actionLoading === ride.id}
                    className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === ride.id
                      ? "Updating..."
                      : "🏁 Complete Ride"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}