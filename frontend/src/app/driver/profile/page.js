"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DRIVER_ID = "0032e29e-856b-4561-b221-04cb59072a7f";
const API_URL = "http://localhost:5000";

const INITIAL_PROFILE = {
  fullName: "",
  phone: "",
  email: "",
  vehicleType: "Sedan",
  vehicleNumber: "",
  licenseNumber: "",
};

export default function DriverProfilePage() {
  const [profile, setProfile] = useState({ ...INITIAL_PROFILE });
  const [originalProfile, setOriginalProfile] = useState({
    ...INITIAL_PROFILE,
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load driver profile
  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

       const token = localStorage.getItem("ridego_token");

if (!token) {
  setError("Login session nahi mila. Please driver account se login karein.");
  window.location.href = "/login";
  return;
}

const response = await fetch(
  `${API_URL}/api/drivers/${DRIVER_ID}/profile`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
    cache: "no-store",
  }
);

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Driver profile load nahi hua."
          );
        }

        const loadedProfile = {
  fullName: data.profile?.full_name ?? data.driver?.full_name ?? "",
  phone: data.profile?.phone ?? data.driver?.phone ?? "",
  email: data.profile?.email ?? data.driver?.email ?? "",
  vehicleType:
    data.driver?.vehicle_type ?? data.profile?.vehicle_type ?? "Sedan",
  vehicleNumber:
    data.driver?.vehicle_number ?? data.profile?.vehicle_number ?? "",
  licenseNumber:
    data.driver?.license_number ?? data.profile?.license_number ?? "",
};

        setProfile(loadedProfile);
        setOriginalProfile(loadedProfile);
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("Profile loading error:", err);
        setError(
          err.message ||
            "Profile load nahi hua. Backend connection check karein."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, []);

  // Handle input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Enable editing
  function handleEdit() {
    setError("");
    setMessage("");
    setEditing(true);
  }

  // Cancel editing
  function handleCancel() {
    setProfile({ ...originalProfile });
    setEditing(false);
    setMessage("");
    setError("");
  }

// Save profile
async function handleSave(event) {
  event.preventDefault();

  if (
    !profile.fullName.trim() ||
    !profile.email.trim() ||
    !profile.vehicleType.trim()
  ) {
    setError("Please enter your name, email, and vehicle type.");
    return;
  }

  try {
    setSaving(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("ridego_token");

    if (!token) {
      setError("Login session nahi mila. Please dobara login karein.");
      window.location.href = "/login";
      return;
    }

    const response = await fetch(
      `${API_URL}/api/drivers/${DRIVER_ID}/profile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          phone: profile.phone.trim(),
          email: profile.email.trim(),
          vehicleType: profile.vehicleType,
          vehicleNumber: profile.vehicleNumber.trim(),
          licenseNumber: profile.licenseNumber.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Driver profile update nahi hua.");
    }

    const updatedProfile = {
      fullName: data.profile?.full_name ?? profile.fullName.trim(),
      phone: data.profile?.phone ?? profile.phone.trim(),
      email: data.profile?.email ?? profile.email.trim(),
      vehicleType: data.driver?.vehicle_type ?? profile.vehicleType,
      vehicleNumber:
        data.driver?.vehicle_number ?? profile.vehicleNumber.trim(),
      licenseNumber:
        data.driver?.license_number ?? profile.licenseNumber.trim(),
    };

    setProfile(updatedProfile);
    setOriginalProfile({ ...updatedProfile });
    setEditing(false);
    setMessage("Driver profile successfully save ho gaya.");
  } catch (err) {
    console.error("Profile save error:", err);
    setError(err.message || "Profile save nahi ho paya.");
  } finally {
    setSaving(false);
  }
}

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
    background: editing ? "#ffffff" : "#f8fafc",
    color: "#0f172a",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontWeight: "500",
    color: "#334155",
  };

  const buttonStyle = {
    padding: "12px 22px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f1f5f9",
          color: "#0f172a",
        }}
      >
        Loading Driver Profile...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "30px 20px",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: "850px", margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "30px", margin: 0 }}>
              👤 Driver Profile
            </h1>

            <p style={{ color: "#64748b" }}>
              Manage your personal and vehicle details.
            </p>
          </div>

          <Link
            href="/driver"
            style={{
              background: "#e2e8f0",
              padding: "11px 16px",
              borderRadius: "8px",
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            ← Dashboard
          </Link>
        </header>

        {/* Profile Card */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 15px #0000000d",
          }}
        >
          {/* Error Message */}
          {error && (
            <div
              role="alert"
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div
              role="status"
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {message}
            </div>
          )}

          {/* Profile Avatar */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "#dbeafe",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "42px",
                margin: "0 auto 12px",
              }}
            >
              👨‍✈️
            </div>

            <h2 style={{ margin: "0 0 6px" }}>
              {profile.fullName || "Driver Name"}
            </h2>

            <p style={{ color: "#64748b", margin: 0 }}>
              RideGo Driver
            </p>
          </div>

          {/* Editing Status */}
          <p
            style={{
              color: editing ? "#15803d" : "#64748b",
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            Editing Status: {editing ? "ON" : "OFF"}
          </p>

          <form onSubmit={handleSave}>
            {/* Personal Information */}
            <h3 style={{ marginBottom: "18px" }}>
              Personal Information
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >
              <label style={labelStyle}>
                Full Name
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  readOnly={!editing || saving}
                  required
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Mobile Number
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  readOnly={!editing || saving}
                  placeholder="Enter mobile number"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Email Address
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  readOnly={!editing || saving}
                  placeholder="Enter email address"
                  style={inputStyle}
                />
              </label>
            </div>

            {/* Vehicle Information */}
            <h3
              style={{
                marginTop: "30px",
                marginBottom: "18px",
              }}
            >
              Vehicle Information
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >
              <label style={labelStyle}>
                Vehicle Type
                <select
                  name="vehicleType"
                  value={profile.vehicleType}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  style={inputStyle}
                >
                  <option value="Bike">Bike</option>
                  <option value="Economy">Economy</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Premium">Premium</option>
                </select>
              </label>

              <label style={labelStyle}>
                Vehicle Number
                <input
                  type="text"
                  name="vehicleNumber"
                  value={profile.vehicleNumber}
                  onChange={handleChange}
                  readOnly={!editing || saving}
                  placeholder="e.g. BR01AB1234"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Driving License Number
                <input
                  type="text"
                  name="licenseNumber"
                  value={profile.licenseNumber}
                  onChange={handleChange}
                  readOnly={!editing || saving}
                  placeholder="Enter license number"
                  style={inputStyle}
                />
              </label>
            </div>
{/* Action Buttons */}
<div
  style={{
    display: "flex",
    gap: "12px",
    marginTop: "30px",
    flexWrap: "wrap",
  }}
>
  {!editing ? (
    <button
      type="button"
      onClick={() => {
        console.log("Edit Profile button clicked");
        setError("");
        setMessage("");
        setEditing(true);
      }}
      style={{
        ...buttonStyle,
        background: "#2563eb",
        color: "#ffffff",
      }}
    >
      ✏️ Edit Profile
    </button>
  ) : (
    <>
      <button type="submit" disabled={saving} style={buttonStyle}>
        {saving ? "Saving..." : "💾 Save Changes"}
      </button>

      <button
        type="button"
        onClick={handleCancel}
        disabled={saving}
        style={buttonStyle}
      >
        Cancel
      </button>
    </>
  )}
</div>
          </form>
        </section>
      </div>
    </main>
  );
}