import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata = {
  title: "CEE Tracker - NEET Preparation",
  description: "Track your NEET exam preparation progress across Physics, Chemistry, Zoology, and Botany",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AuthProvider>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
