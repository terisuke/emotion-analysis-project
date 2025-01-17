'use client';

import { Suspense } from 'react';
import EmotionAnalysis from '@/components/EmotionAnalysis';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<div>Loading...</div>}>
          <EmotionAnalysis />
        </Suspense>
      </div>
    </main>
  );
}