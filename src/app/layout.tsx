export const metadata = {
  title: 'Worldview Flight Map',
  description: 'A 3D map of flights around the world',
};

import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E✈%3C/text%3E%3C/svg%3E" />
      </head>
      <body>{children}</body>
    </html>
  );
}
