"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";

export default function RideStatusPage() {
  const params = useParams();
  const rideId = params.id;

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    // Driver Rating states
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [ratingError, setRatingError] = useState("");

  // Payment states
  const [payment, setPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  // Fetch payment details
  const fetchPayment = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/payments/${id}`
      );

      const data = await response.json();

      if (response.status === 404) {
        setPayment(null);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch payment"
        );
      }

      setPayment(data.payment || null);
      setPaymentError("");
    } catch (err) {
      console.error("Fetch payment error:", err);
      setPaymentError(
        err.message || "Unable to load payment"
      );
    }
  };

  // Fetch ride details
  const fetchRide = async () => {
    try {
      setError("");

      const response = await fetch(
  `http://localhost:5000/api/rides/${rideId}`
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch ride"
        );
      }

      setRide(data.ride);

      // Load payment when ride is completed
      if (data.ride.status === "completed") {
        await fetchPayment(data.ride.id);
      }
    } catch (err) {
      console.error("Ride status error:", err);
      setError(
        err.message || "Unable to load ride status"
      );
    } finally {
      setLoading(false);
    }
  };

// Submit Driver Rating
const submitRating = async () => {
  if (selectedRating < 1 || selectedRating > 5) {
    setRatingError("Please select a rating from 1 to 5 stars.");
    return;
  }

  try {
    setRatingLoading(true);
    setRatingError("");
    setRatingMessage("");

    const token = localStorage.getItem("ridego_token");

    if (!token) {
      setRatingError("Please login first to submit your rating.");
      return;
    }

    const response = await fetch(
      `http://localhost:5000/api/rides/${rideId}/rating`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: selectedRating,
          comment: ratingReview,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to submit rating.");
    }

    setRatingMessage(data.message || "Rating submitted successfully!");
    setSelectedRating(0);
    setRatingReview("");
  } catch (err) {
    setRatingError(err.message || "Unable to submit rating.");
  } finally {
    setRatingLoading(false);
  }
};

  // Create payment record
  const createPayment = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError("");
      setPaymentMessage("");

      const response = await fetch(
        "http://localhost:5000/api/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ride_id: rideId,
            payment_method: paymentMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create payment"
        );
      }

      setPayment(data.payment || null);
      setPaymentMessage(
        data.message || "Payment record created."
      );
    } catch (err) {
      setPaymentError(
        err.message || "Unable to create payment"
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  

  // Demo action: mark cash payment as paid
  const markCashPaid = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError("");
      setPaymentMessage("");

      const response = await fetch(
        `http://localhost:5000/api/payments/${rideId}/cash-paid`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update cash payment"
        );
      }

      setPayment(data.payment || null);
      setPaymentMessage(
        "Cash payment marked as paid."
      );
    } catch (err) {
      setPaymentError(
        err.message || "Unable to update cash payment"
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // Open Razorpay Checkout for online payment
const payOnline = async () => {
  try {
    setPaymentLoading(true);
    setPaymentError("");
    setPaymentMessage("");

    if (!window.Razorpay) {
      throw new Error(
        "Razorpay load nahi hua. Page refresh karke dobara try karein."
      );
    }

    let currentPayment = payment;

    // Create online payment record if needed
    if (
      !currentPayment ||
      currentPayment.payment_method !== "online" ||
      currentPayment.payment_status !== "pending"
    ) {
      const paymentResponse = await fetch(
        "http://localhost:5000/api/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ride_id: rideId,
            payment_method: "online",
          }),
        }
      );

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          paymentData.message || "Unable to create online payment"
        );
      }

      currentPayment = paymentData.payment || null;
      setPayment(currentPayment);
    }

    if (!currentPayment) {
      throw new Error("Payment record create nahi hua.");
    }

    if (currentPayment.payment_status === "paid") {
      setPaymentMessage("This ride is already paid.");
      return;
    }

    // Create Razorpay order
    const orderResponse = await fetch(
      "http://localhost:5000/api/payments/razorpay/order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ride_id: rideId,
        }),
      }
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(
        orderData.message || "Unable to create Razorpay order"
      );
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "RideGo",
      description: "Cab Ride Payment",
      order_id: orderData.order_id,

      handler: async function (response) {
        try {
          setPaymentLoading(true);
          setPaymentError("");

          const verifyResponse = await fetch(
            "http://localhost:5000/api/payments/razorpay/verify",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ride_id: rideId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            }
          );

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok || !verifyData.success) {
            throw new Error(
              verifyData.message || "Payment verification failed"
            );
          }

          setPaymentMessage("Payment verified successfully!");
          await fetchPayment(rideId);
        } catch (err) {
          setPaymentError(
            err.message || "Payment verification failed"
          );
        } finally {
          setPaymentLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          setPaymentLoading(false);
        },
      },

      theme: {
        color: "#16a34a",
      },
    };

    const checkout = new window.Razorpay(options);

    checkout.on("payment.failed", function (response) {
      setPaymentError(
        response.error.description || "Payment failed. Please try again."
      );
      setPaymentLoading(false);
    });

    checkout.open();
  } catch (err) {
    setPaymentError(err.message || "Online payment failed");
  } finally {
    setPaymentLoading(false);
  }
};

  // Refresh ride status automatically
  useEffect(() => {
    if (!rideId) return;

    fetchRide();

    const interval = setInterval(() => {
      fetchRide();
    }, 5000);

    return () => clearInterval(interval);
  }, [rideId]);

  // Convert status to readable text
  const getStatusText = (status) => {
    switch (status) {
      case "requested":
        return "Ride Requested";
      case "accepted":
        return "Driver Accepted";
      case "driver_arriving":
        return "Driver is Arriving";
      case "started":
        return "Ride Started";
      case "completed":
        return "Ride Completed";
      case "cancelled":
        return "Ride Cancelled";
      default:
        return status;
    }
  };

  // Ride progress steps
  const statusSteps = [
    {
      key: "requested",
      icon: "📝",
      title: "Ride Requested",
      description: "Your ride request has been sent.",
    },
    {
      key: "accepted",
      icon: "✅",
      title: "Driver Accepted",
      description: "A driver has accepted your ride.",
    },
    {
      key: "driver_arriving",
      icon: "🚕",
      title: "Driver is Arriving",
      description:
        "Your driver is coming to the pickup location.",
    },
    {
      key: "started",
      icon: "🚗",
      title: "Ride Started",
      description: "Your journey has started.",
    },
    {
      key: "completed",
      icon: "🏁",
      title: "Ride Completed",
      description:
        "Your ride has been completed successfully.",
    },
  ];

  const getStepIndex = (status) => {
    return statusSteps.findIndex(
      (step) => step.key === status
    );
  };

  // Loading screen
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="rounded-2xl bg-white p-10 text-center shadow-lg">
          <div className="text-5xl">🚕</div>

          <p className="mt-4 text-gray-600">
            Loading ride status...
          </p>
        </div>
      </main>
    );
  }

  // Error screen
  if (error) {
    return (
      <main className="min-h-screen bg-gray-100">
        <header className="bg-black px-6 py-5 text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <h1 className="text-2xl font-bold">
              RideGo
            </h1>

            <a
              href="/"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Home
            </a>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="text-5xl">❌</div>

            <h2 className="mt-4 text-2xl font-bold text-red-600">
              Ride Not Found
            </h2>

            <p className="mt-2 text-gray-600">
              {error}
            </p>

            <a
              href="/"
              className="mt-6 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Go Home
            </a>
          </div>
        </section>
      </main>
    );
  }

   if (!ride) {
    return null;
  }

  const currentStep = getStepIndex(ride.status);
  const isCancelled = ride.status === "cancelled";

  const displayedFare =
    ride.status === "completed"
      ? ride.final_fare ?? ride.estimated_fare ?? 0
      : ride.estimated_fare ?? 0;

  return (
    <>
      {/* Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-black px-6 py-5 text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">RideGo</h1>

            <div className="flex flex-wrap gap-3">
              <a
                href="/"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
              >
                Home
              </a>

              <a
                href="/rides"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
              >
                Ride History
              </a>
            </div>
          </div>
        </header>

        {/* Main */}
        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          {/* Title */}
          <div className="mb-8 text-center">
            <div className="text-5xl">🚕</div>

            <h2 className="mt-4 text-3xl font-bold text-gray-900">
              Ride Status
            </h2>

            <p className="mt-2 text-gray-600">
              Your ride status updates automatically.
            </p>
          </div>

          {/* Current Status */}
          <div
            className={`mb-6 rounded-2xl p-6 text-center shadow ${
              isCancelled ? "bg-red-50" : "bg-white"
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Current Status
            </p>

            <h3
              className={`mt-2 text-3xl font-bold ${
                isCancelled ? "text-red-600" : "text-gray-900"
              }`}
            >
              {getStatusText(ride.status)}
            </h3>
          </div>

          {/* Cancelled Ride */}
          {isCancelled ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow">
              <div className="text-5xl">❌</div>

              <h3 className="mt-4 text-2xl font-bold text-red-600">
                Ride Cancelled
              </h3>

              <p className="mt-2 text-gray-600">
                This ride is no longer active.
              </p>

              <a
                href="/book"
                className="mt-6 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
              >
                Book New Ride
              </a>
            </div>
          ) : (
            <>
              {/* Status Timeline */}
              <div className="rounded-2xl bg-white p-6 shadow">
                <h3 className="mb-6 text-xl font-bold text-gray-900">
                  Ride Progress
                </h3>

                <div className="space-y-6">
                  {statusSteps.map((step, index) => {
                    const completed =
                      currentStep >= 0 && index <= currentStep;

                    return (
                      <div
                        key={step.key}
                        className="flex items-start gap-4"
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                            completed
                              ? "bg-black text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {step.icon}
                        </div>

                        <div className="pt-1">
                          <h4
                            className={`font-bold ${
                              completed
                                ? "text-gray-900"
                                : "text-gray-400"
                            }`}
                          >
                            {step.title}
                          </h4>

                          <p
                            className={`mt-1 text-sm ${
                              completed
                                ? "text-gray-600"
                                : "text-gray-400"
                            }`}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ride Details */}
              <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                <h3 className="mb-5 text-xl font-bold text-gray-900">
                  Ride Details
                </h3>

                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Ride ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-gray-800">
                    {ride.id}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-500">
                    📍 Pickup
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {ride.pickup_location}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-500">
                    🏁 Destination
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {ride.drop_location}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-100 p-4">
                  <p className="text-sm text-gray-500">
                    {ride.status === "completed"
                      ? "Final Fare"
                      : "Estimated Fare"}
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    ₹{Number(displayedFare).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Driver Details */}
              {ride.driver_name && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                  <h3 className="mb-5 text-xl font-bold text-gray-900">
                    Driver Details
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Driver</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {ride.driver_name}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {ride.driver_phone || "Not available"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">License</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {ride.license_number || "Not available"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="mt-1 font-bold text-gray-900">
                        ⭐ {ride.driver_rating ?? "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

                            {/* Driver Rating Section */}
              {ride.status === "completed" && ride.driver_name && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    ⭐ Rate Your Driver
                  </h3>

                  <p className="mb-4 text-sm text-gray-600">
                    How was your ride experience?
                  </p>

                  <div className="mb-4 flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        className={`text-3xl ${
                          star <= selectedRating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                        aria-label={`Rate ${star} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <p className="mb-4 text-sm text-gray-600">
                    {selectedRating > 0
                      ? `You selected ${selectedRating} out of 5 stars.`
                      : "Please select your rating."}
                  </p>

                  <textarea
                    value={ratingReview}
                    onChange={(e) => setRatingReview(e.target.value)}
                    placeholder="Write your review (optional)"
                    rows={3}
                    maxLength={500}
                    className="mb-4 w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-black"
                  />

                  {ratingError && (
                    <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {ratingError}
                    </p>
                  )}

                  {ratingMessage && (
                    <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      {ratingMessage}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={submitRating}
                    disabled={ratingLoading}
                    className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {ratingLoading ? "Submitting..." : "Submit Rating"}
                  </button>
                </div>
              )}


              {/* Payment Section */}
              {ride.status === "completed" && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow">
                  <h3 className="mb-4 text-xl font-bold text-gray-900">
                    💳 Payment
                  </h3>

                  <p className="mb-4 text-gray-600">
                    Total Fare: ₹{Number(displayedFare).toFixed(2)}
                  </p>

                  {paymentError && (
                    <p className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">
                      {paymentError}
                    </p>
                  )}

                  {paymentMessage && (
                    <p className="mb-3 rounded-lg bg-green-50 p-3 text-green-700">
                      {paymentMessage}
                    </p>
                  )}

                  {payment ? (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">
                        Payment Method
                      </p>

                      <p className="font-bold capitalize text-gray-900">
                        {payment.payment_method}
                      </p>

                      <p className="mt-3 text-sm text-gray-500">
                        Payment Status
                      </p>

                      <p className="font-bold capitalize text-gray-900">
                        {payment.payment_status}
                      </p>

                      {payment.payment_status === "pending" &&
                        payment.payment_method === "cash" && (
                          <button
                            onClick={markCashPaid}
                            disabled={paymentLoading}
                            className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {paymentLoading
                              ? "Updating..."
                              : "Confirm Cash Collected (Demo)"}
                          </button>
                        )}

                      {payment.payment_status === "pending" &&
                        payment.payment_method === "online" && (
                          <div className="mt-4">
                            <p className="mb-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                              Online payment pending hai. Pay Now par click karke payment complete karein.
                            </p>

                            <button
                              onClick={payOnline}
                              disabled={paymentLoading}
                              className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {paymentLoading
                                ? "Please wait..."
                                : `Pay Now ₹${Number(displayedFare).toFixed(2)}`}
                            </button>
                          </div>
                        )}
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 font-semibold text-gray-700">
                        Select Payment Method
                      </p>

                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPaymentMethod("cash")}
                          className={`rounded-lg border p-4 font-semibold ${
                            paymentMethod === "cash"
                              ? "border-black bg-gray-100"
                              : "border-gray-200"
                          }`}
                        >
                          💵 Cash
                        </button>

                        <button
                          onClick={() => setPaymentMethod("online")}
                          className={`rounded-lg border p-4 font-semibold ${
                            paymentMethod === "online"
                              ? "border-black bg-gray-100"
                              : "border-gray-200"
                          }`}
                        >
                          📱 Online
                        </button>
                      </div>

                      {paymentMethod === "online" && (
                        <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-amber-800">
                          Continue karne par pending online payment record banega. Uske baad Pay Now button se checkout khulega.
                        </p>
                      )}

                      <button
                        onClick={createPayment}
                        disabled={paymentLoading}
                        className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {paymentLoading ? "Please wait..." : "Continue"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={fetchRide}
                  className="flex-1 rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
                >
                  🔄 Refresh Status
                </button>

                <a
                  href="/book"
                  className="flex-1 rounded-lg bg-white px-6 py-3 text-center font-semibold text-gray-900 shadow hover:bg-gray-50"
                >
                  🚕 Book New Ride
                </a>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}