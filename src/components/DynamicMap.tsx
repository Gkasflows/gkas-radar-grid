'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import SplashScreen from './SplashScreen';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div style={{width:'100vw',height:'100vh',background:'#050810'}}></div>
});

export default function DynamicMap() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Map />
    </>
  );
}
