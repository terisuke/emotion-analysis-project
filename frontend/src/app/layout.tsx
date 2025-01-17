import React from 'react';
import './globals.css';

export const metadata = {
  title: '感情分析アプリ',
  description: 'リアルタイム感情分析システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div>
          {children}
        </div>
      </body>
    </html>
  );
}