import "./globals.css";

export const metadata = {
  title: "Cab Booking App",
  description: "Full-stack cab booking application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}