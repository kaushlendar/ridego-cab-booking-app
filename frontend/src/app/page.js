export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-black px-6 py-4 text-white">
        <h1 className="text-2xl font-bold">RideGo</h1>

        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-300">
            Home
          </a>
          <a href="#" className="hover:text-gray-300">
            Rides
          </a>
          <a href="#" className="hover:text-gray-300">
            Login
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex min-h-[80vh] items-center justify-center px-6">
        <div className="grid w-full max-w-6xl gap-10 md:grid-cols-2">
          
          {/* Left Content */}
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-lg font-semibold text-gray-600">
              Your ride, your way
            </p>

            <h2 className="text-5xl font-bold leading-tight text-black">
              Book a ride
              <br />
              whenever you need
            </h2>

            <p className="mt-5 max-w-lg text-lg text-gray-600">
              Fast, safe and affordable rides at your fingertips.
              Book your cab and reach your destination comfortably.
            </p>

            <div className="mt-8">
              <a
                href="/book"
                className="inline-block rounded-lg bg-black px-8 py-4 text-lg font-semibold text-white hover:bg-gray-800"
              >
                Book a Ride
              </a>
            </div>
          </div>

          {/* Booking Card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="mb-6 text-2xl font-bold text-black">
                Where are you going?
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Pickup Location
                  </label>

                  <input
                    type="text"
                    placeholder="Enter pickup location"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Destination
                  </label>

                  <input
                    type="text"
                    placeholder="Enter destination"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <button className="w-full rounded-lg bg-black py-3 font-semibold text-white hover:bg-gray-800">
                  Find a Ride
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-black">
            Why choose RideGo?
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-gray-100 p-6">
              <h3 className="text-xl font-bold">🚕 Easy Booking</h3>
              <p className="mt-3 text-gray-600">
                Book your ride quickly from your pickup and destination.
              </p>
            </div>

            <div className="rounded-xl bg-gray-100 p-6">
              <h3 className="text-xl font-bold">📍 Live Tracking</h3>
              <p className="mt-3 text-gray-600">
                Track your driver and ride location in real time.
              </p>
            </div>

            <div className="rounded-xl bg-gray-100 p-6">
              <h3 className="text-xl font-bold">💳 Secure Payment</h3>
              <p className="mt-3 text-gray-600">
                Pay securely after completing your ride.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black px-6 py-6 text-center text-white">
        <p>© 2026 RideGo. All rights reserved.</p>
      </footer>
    </main>
  );
}