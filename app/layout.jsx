import './globals.css';

export const metadata = {
  title: 'Chat GPV',
  description: 'Central digital de atendimento GPV',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
