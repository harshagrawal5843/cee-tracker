import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { UserDataProvider } from "@/lib/UserDataContext";
import Script from "next/script";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "CEE Tracker - Common Entrance Exam Preparation",
  description:
    "Track your CEE exam preparation progress across Physics, Chemistry, Zoology, and Botany",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function() {
            try {
              var storedTheme = localStorage.getItem('cee-tracker-theme');
              var theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
              document.documentElement.classList.toggle('dark', theme === 'dark');
            } catch (error) {
              document.documentElement.classList.add('dark');
            }
          })();`}
        </Script>
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AuthProvider>
          <UserDataProvider>
            <ThemeToggle />
            <main className="flex-1">{children}</main>
          </UserDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
