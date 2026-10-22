"use client";

import { useEffect, useState } from "react";

export default function RidesPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRideHistory = async () => {
    try {
      setLoading(true);
      setError("");

 const token = localStorage.getItem("ridego_token");

if (!token) {
  setError("Please login first to view your ride history.");
  return;
}

const response = await fetch(
  "http://localhost:5000/api/rides/history",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch ride history"
        );
      }

      setRides(data.rides || []);
    } catch (error) {
      console.error("Ride history error:", error);
      setError(
        error.message || "Unable to load ride history"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRideHistory();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black px-6 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-2xl font-bold">
            RideGo
          </h1>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Home
            </a>

            <a
              href="/book"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Book Ride
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Ride History
          </h2>

          <p className="mt-2 text-gray-600">
            View your completed and cancelled rides.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">
              Error
            </p>

            <p className="mt-1">
              {error}
            </p>

            <button
              onClick={fetchRideHistory}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow">
            <div className="text-4xl">
              🚕
            </div>

            <p className="mt-4 text-gray-600">
              Loading ride history...
            </p>
          </div>
        ) : rides.length === 0 ? (
          /* Empty */
          <div className="rounded-2xl bg-white p-10 text-center shadow">
            <div className="text-5xl">
              🚕
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900">
              No Ride History
            </h3>

            <p className="mt-2 text-gray-500">
              You don't have any completed or cancelled rides yet.
            </p>

            <a
              href="/book"
              className="mt-6 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Book a Ride
            </a>
          </div>
        ) : (
          /* Ride Cards */
          <div className="grid gap-6 md:grid-cols-2">
            {rides.map((ride) => {
              const isCompleted =
                ride.status === "completed";

              const fare =
                ride.final_fare ||
                ride.estimated_fare ||
                0;

              return (
                <div
                  key={ride.id}
                  className="rounded-2xl bg-white p-6 shadow-md"
                >
                  {/* Header */}
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">
                      🚕 Ride
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>

                  {/* Ride ID */}
                  <div className="mb-5 rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">
                      Ride ID
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-gray-800">
                      {ride.id}
                    </p>
                  </div>

                  {/* Pickup */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-500">
                      📍 Pickup
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {ride.pickup_location}
                    </p>
                  </div>

                  {/* Destination */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-500">
                      🏁 Destination
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {ride.drop_location}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-500">
                      📅 Date
                    </p>

                    <p className="mt-1 text-gray-800">
                      {new Date(
                        ride.ride_date
                      ).toLocaleString()}
                    </p>
                  </div>

                  {/* Driver */}
                  {ride.driver_name ? (
                    <div className="mb-5 border-t pt-5">
                      <p className="text-sm font-semibold text-gray-500">
                        👤 Driver
                      </p>

                      <p className="mt-1 font-medium text-gray-900">
                        {ride.driver_name}
                      </p>

                      {ride.driver_phone && (
                        <p className="text-sm text-gray-600">
                          📞 {ride.driver_phone}
                        </p>
                      )}

                      {ride.license_number && (
                        <p className="text-sm text-gray-600">
                          🪪 {ride.license_number}
                        </p>
                      )}

                      {ride.driver_rating !== null &&
                        ride.driver_rating !== undefined && (
                          <p className="text-sm text-gray-600">
                            ⭐ {ride.driver_rating}
                          </p>
                        )}
                    </div>
                  ) : (
                    <div className="mb-5 border-t pt-5">
                      <p className="text-sm text-gray-500">
                        👤 Driver information not available
                      </p>
                    </div>
                  )}

                  {/* Fare */}
                  <div className="rounded-xl bg-gray-100 p-4">
                    {isCompleted ? (
                      <>
                        <p className="text-sm text-gray-500">
                          Final Fare
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          ₹{fare}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">
                          Ride Status
                        </p>

                        <p className="mt-1 text-xl font-bold text-red-600">
                          Ride Cancelled
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}