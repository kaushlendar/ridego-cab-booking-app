"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = "http://localhost:5000";

export default function DriverRideDetailsPage() {
  const params = useParams();
  const rideId = params.id;

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rideId) return;

    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/rides/${rideId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load ride details"
          );
        }

        setRide(data.ride);
      } catch (err) {
        setError(
          err.message || "Failed to load ride details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRideDetails();
  }, [rideId]);

  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString("en-IN");
  };

  const statusColors = {
    requested: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    driver_arriving: "bg-purple-100 text-purple-800",
    started: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg font-semibold text-gray-700">
          Loading ride details...
        </p>
      </main>
    );
  }

  if (error || !ride) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-red-600">
            Ride Details Not Found
          </h1>

          <p className="mt-3 text-gray-600">
            {error || "Ride details are unavailable."}
          </p>

          <Link
            href="/driver/history"
            className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-semibold text-white"
          >
            Back to Ride History
          </Link>
        </div>
      </main>
    );
  }

  const fare =
    ride.final_fare ?? ride.estimated_fare ?? 0;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ride Details
            </h1>

            <p className="mt-2 text-gray-600">
              View complete information about this ride.
            </p>
          </div>

          <Link
            href="/driver/history"
            className="rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
          >
            ← Back to History
          </Link>
        </header>

        {/* Ride Status */}
        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              Ride Information
            </h2>

            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                statusColors[ride.status] ||
                "bg-gray-100 text-gray-700"
              }`}
            >
              {String(ride.status || "unknown")
                .replaceAll("_", " ")
                .toUpperCase()}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">Ride ID</p>

            <p className="mt-1 break-all font-medium text-gray-900">
              {ride.id}
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                📍 Pickup Location
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {ride.pickup_location || "Not available"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                🏁 Destination
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {ride.drop_location || "Not available"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Booking Date
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {formatDate(
                  ride.created_at || ride.createdAt
                )}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Total Fare
              </p>

              <p className="mt-2 text-2xl font-bold text-green-700">
                ₹{Number(fare).toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        {/* Driver Information */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            Driver Information
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Driver Name</p>

              <p className="mt-1 font-semibold text-gray-900">
                {ride.driver_name || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Driver Phone</p>

              <p className="mt-1 font-semibold text-gray-900">
                {ride.driver_phone || "Not available"}
              </p>
            </div>
          </div>
        </section>

        {/* Payment Information */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            Payment Information
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>

              <p className="mt-1 font-semibold capitalize text-gray-900">
                {ride.payment_method || "Check payment record"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Payment Status</p>

              <p className="mt-1 font-semibold capitalize text-gray-900">
                {ride.payment_status || "Check payment record"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <Link
            href="/driver/dashboard"
            className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Go to Driver Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}