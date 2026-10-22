"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../../components/Map"), {
  ssr: false,
});

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function BookRide() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [showRides, setShowRides] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [selectingLocation, setSelectingLocation] = useState("pickup");

  const [booking, setBooking] = useState(false);
  const [bookedRideId, setBookedRideId] = useState(null);
  const [rideStatus, setRideStatus] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Get authentication token
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("ridego_token");
  };

  // Select pickup and destination from map
  const handleMapLocationSelect = async (location) => {
    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number"
    ) {
      alert("Invalid map location. Please select again.");
      return;
    }

    let address = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}`
      );

      if (response.ok) {
        const data = await response.json();
        address = data.display_name || address;
      }
    } catch (error) {
      console.error("Address lookup failed:", error);
    }

    if (selectingLocation === "pickup") {
      setPickupLocation(location);
      setPickup(address);
      setSelectingLocation("destination");
    } else {
      setDestinationLocation(location);
      setDestination(address);
    }
  };

  // Find rides
  const findRides = () => {
    if (!pickup.trim() || !destination.trim()) {
      alert("Please enter pickup and destination.");
      return;
    }

    if (!pickupLocation || !destinationLocation) {
      alert("Please select pickup and destination on the map.");
      return;
    }

    setShowRides(true);
  };

  // Calculate fare
  const calculateFare = (baseFare, perKmRate) => {
    const km = Number(distance);

    if (!Number.isFinite(km) || km <= 0) {
      return baseFare;
    }

    return Math.round(baseFare + km * perKmRate);
  };

  // Available ride options
  const rides = [
    {
      id: 1,
      name: "Economy",
      icon: "🚕",
      description: "Affordable ride for everyday travel.",
      price: calculateFare(50, 12),
      time: "3 min away",
    },
    {
      id: 2,
      name: "Sedan",
      icon: "🚗",
      description: "Comfortable ride with extra space.",
      price: calculateFare(80, 16),
      time: "5 min away",
    },
    {
      id: 3,
      name: "Premium",
      icon: "🚘",
      description: "Premium car for a comfortable journey.",
      price: calculateFare(120, 22),
      time: "7 min away",
    },
  ];

  // Fetch live ride status
  const fetchRideStatus = async (rideId) => {
    const token = getToken();

    if (!token || !rideId) return;

    try {
      setStatusLoading(true);

      const response = await fetch(
        `${API_URL}/api/rides/${encodeURIComponent(rideId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to fetch ride status"
        );
      }

      const ride = data.ride;

      setRideStatus(ride?.status || null);

      if (ride?.driver_id) {
        setDriverDetails({
          name: ride.driver_name,
          phone: ride.driver_phone,
          rating: ride.driver_rating,
          license: ride.license_number,
          status: ride.driver_status,
        });
      } else {
        setDriverDetails(null);
      }
    } catch (error) {
      console.error("Ride status error:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  // Refresh ride status every 5 seconds
  useEffect(() => {
    if (!bookedRideId) return;

    fetchRideStatus(bookedRideId);

    const interval = setInterval(() => {
      fetchRideStatus(bookedRideId);
    }, 5000);

    return () => clearInterval(interval);
  }, [bookedRideId]);

  // Confirm ride booking
  const handleConfirmRide = async () => {
    if (!pickupLocation || !destinationLocation || !selectedRide) {
      alert("Please select pickup, destination and a ride.");
      return;
    }

    const token = getToken();

    if (!token) {
      alert("Please login first to book a ride.");
      window.location.href = "/login";
      return;
    }

    setBooking(true);

    try {
      const response = await fetch(`${API_URL}/api/rides`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          pickupLocation: pickup,
          dropLocation: destination,
          pickupLat: pickupLocation.lat,
          pickupLng: pickupLocation.lng,
          dropLat: destinationLocation.lat,
          dropLng: destinationLocation.lng,
          estimatedFare: Number(selectedRide.price),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Booking API error:", data);

        throw new Error(
          data.error ||
            data.message ||
            `Ride booking failed (${response.status})`
        );
      }

      if (!data.ride?.id) {
        console.error("Unexpected booking response:", data);
        throw new Error("Booking API did not return a ride ID.");
      }

      console.log("Ride booked successfully:", data);

      setBookedRideId(data.ride.id);
      setRideStatus(data.ride.status || "requested");

      alert("Ride booked successfully!");

      window.location.href = `/ride/${data.ride.id}`;
    } catch (error) {
      console.error("Ride booking error:", error);

      alert(error.message || "Failed to book ride. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-black px-6 py-4 text-white">
        <h1 className="text-2xl font-bold">RideGo</h1>

        <a
          href="/"
          className="rounded-lg px-4 py-2 hover:bg-gray-800"
        >
          Home
        </a>
      </nav>

      {/* Main section */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl font-bold text-black">
            Book Your Ride
          </h2>

          <p className="mt-2 text-gray-600">
            Enter your pickup and destination to find a ride.
          </p>

          {/* Location form */}
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-lg">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-semibold text-gray-700">
                  Pickup Location
                </label>

                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Enter pickup location"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-700">
                  Destination
                </label>

                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Where do you want to go?"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>
            </div>

            <button
              onClick={findRides}
              className="mt-6 w-full rounded-lg bg-black py-4 font-semibold text-white hover:bg-gray-800"
            >
              Find Rides
            </button>
          </div>

          {/* Map */}
          <div className="mt-8">
            <div className="mb-3 rounded-lg bg-white p-4 shadow">
              <p className="font-semibold text-black">
                {selectingLocation === "pickup"
                  ? "📍 Click on the map to select Pickup Location"
                  : "🏁 Click on the map to select Destination"}
              </p>
            </div>

            <Map
              pickupLocation={pickupLocation}
              destinationLocation={destinationLocation}
              onLocationSelect={handleMapLocationSelect}
              onRouteFound={(distanceInKm) => {
                setDistance(distanceInKm);
              }}
            />

            {distance !== null &&
              Number.isFinite(Number(distance)) && (
                <div className="mt-4 rounded-xl bg-white p-4 shadow">
                  <p className="font-semibold text-gray-800">
                    Route Distance: {Number(distance).toFixed(2)} km
                  </p>
                </div>
              )}
          </div>

          {/* Ride options */}
          {showRides && (
            <div className="mt-10">
              <h3 className="text-2xl font-bold text-black">
                Available Rides
              </h3>

              <p className="mt-2 text-gray-600">
                {pickup} → {destination}
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    className={`rounded-xl bg-white p-5 shadow transition ${
                      selectedRide?.id === ride.id
                        ? "ring-2 ring-black"
                        : ""
                    }`}
                  >
                    <div className="text-5xl">{ride.icon}</div>

                    <h4 className="mt-4 text-xl font-bold">
                      {ride.name}
                    </h4>

                    <p className="mt-2 text-sm text-gray-600">
                      {ride.description}
                    </p>

                    <p className="mt-3 text-sm font-medium text-gray-500">
                      {ride.time}
                    </p>

                    <p className="mt-4 text-2xl font-bold">
                      ₹{ride.price}
                    </p>

                    <button
                      onClick={() => setSelectedRide(ride)}
                      className="mt-4 w-full rounded-lg bg-black py-3 font-semibold text-white hover:bg-gray-800"
                    >
                      {selectedRide?.id === ride.id
                        ? "Selected ✓"
                        : "Select"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          {selectedRide && (
            <div className="mt-8 rounded-2xl bg-black p-6 text-white shadow-lg">
              <h3 className="text-2xl font-bold">
                Confirm Your Ride
              </h3>

              <div className="mt-5 space-y-2">
                <p>
                  <span className="font-semibold">Pickup:</span>{" "}
                  {pickup}
                </p>

                <p>
                  <span className="font-semibold">Destination:</span>{" "}
                  {destination}
                </p>

                <p>
                  <span className="font-semibold">Ride:</span>{" "}
                  {selectedRide.name}
                </p>

                <p>
                  <span className="font-semibold">Distance:</span>{" "}
                  {distance !== null &&
                  Number.isFinite(Number(distance))
                    ? `${Number(distance).toFixed(2)} km`
                    : "Calculating..."}
                </p>

                <p>
                  <span className="font-semibold">Fare:</span>{" "}
                  ₹{selectedRide.price}
                </p>
              </div>

              <button
                onClick={handleConfirmRide}
                disabled={booking}
                className="mt-6 w-full rounded-lg bg-white py-3 font-bold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {booking ? "Booking Ride..." : "Confirm Ride"}
              </button>
            </div>
          )}

          {/* Live ride status */}
          {bookedRideId && (
            <div className="mt-10 rounded-2xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    🚕 Your Ride
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Ride ID: {bookedRideId}
                  </p>
                </div>

                {statusLoading && (
                  <span className="text-sm text-gray-500">
                    Updating...
                  </span>
                )}
              </div>

              <div className="mt-6 rounded-xl bg-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-500">
                  Ride Status
                </p>

                <p className="mt-2 text-2xl font-bold capitalize text-gray-900">
                  {rideStatus === "requested" && "⏳ Searching for Driver"}
                  {rideStatus === "accepted" && "✅ Ride Accepted"}
                  {rideStatus === "driver_arriving" && "🚕 Driver is Arriving"}
                  {rideStatus === "started" && "🚗 Ride Started"}
                  {rideStatus === "completed" && "🏁 Ride Completed"}
                  {rideStatus === "cancelled" && "❌ Ride Cancelled"}
                  {!rideStatus && "Loading..."}
                </p>
              </div>

              {/* Driver details */}
              {driverDetails && (
                <div className="mt-6">
                  <h4 className="text-xl font-bold text-gray-900">
                    👤 Driver Details
                  </h4>

                  <div className="mt-4 rounded-xl border border-gray-200 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">
                          Driver Name
                        </p>

                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {driverDetails.name || "RideGo Driver"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          Phone
                        </p>

                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {driverDetails.phone || "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          Rating
                        </p>

                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          ⭐ {driverDetails.rating || "0.00"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          License
                        </p>

                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {driverDetails.license || "Not available"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Waiting for driver */}
              {!driverDetails && rideStatus === "requested" && (
                <div className="mt-6 rounded-xl bg-yellow-50 p-5 text-yellow-800">
                  <p className="font-semibold">
                    🔎 Searching for an available driver...
                  </p>

                  <p className="mt-1 text-sm">
                    Please wait. Driver details will appear automatically
                    when a driver accepts the ride.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}