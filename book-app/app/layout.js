import "./globals.css";

export const metadata = {
  title: "Trading Without Ego — Interactive Book",
  description:
    "An AI-guided journey through Marcos Bulcao's method for traders who want to stop fighting their emotions and start using them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
