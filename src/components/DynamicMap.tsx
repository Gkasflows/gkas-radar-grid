'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
      Loading Map Engine...
    </div>
  )
});

export default function DynamicMap() {
  return <Map />;
}
