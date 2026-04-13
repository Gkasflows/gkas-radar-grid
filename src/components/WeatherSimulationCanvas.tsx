import React, { useEffect, useRef } from 'react';

export type WeatherCondition = 'rain' | 'snow' | 'thunder' | 'clear';

export default function WeatherSimulationCanvas({ condition }: { condition: WeatherCondition }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (condition === 'clear') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Start hardware accelerated 2D context
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let animationFrameId: number;
    let particles: any[] = [];
    
    const isSnow = condition === 'snow';
    const isThunder = condition === 'thunder';
    const isRain = condition === 'rain' || condition === 'thunder';
    
    // Keep numbers mathematically safe so it consumes absolutely ~0% CPU.
    const count = isSnow ? 150 : 350; 
    
    for (let i = 0; i < count; i++) {
       particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          l: isSnow ? Math.random() * 2 + 1 : Math.random() * 15 + 10, // Drop length/radius
          xs: isSnow ? Math.random() * 1 - 0.5 : Math.random() * 3 - 1.5, // Drifting X velocity 
          ys: isSnow ? Math.random() * 2 + 1 : Math.random() * 20 + 20 // Fast furious descent for rain
       });
    }

    let thunderAlpha = 0;
    let thunderTimer = 0;

    const render = () => {
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       
       // Handle cinematic lightning flashes
       if (isThunder) {
          thunderTimer++;
          if (thunderTimer > Math.random() * 500 + 200) {
              thunderAlpha = 1;
              thunderTimer = 0;
          }
          if (thunderAlpha > 0) {
              ctx.fillStyle = `rgba(255, 255, 255, ${thunderAlpha * 0.15})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              thunderAlpha -= 0.05;
          }
       }

       if (isSnow) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
             const p = particles[i];
             ctx.moveTo(p.x, p.y);
             ctx.arc(p.x, p.y, p.l, 0, Math.PI * 2, true);
          }
          ctx.fill();
       } else if (isRain) {
          ctx.strokeStyle = 'rgba(174, 214, 255, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
             const p = particles[i];
             ctx.moveTo(p.x, p.y);
             ctx.lineTo(p.x + p.xs, p.y + p.ys);
          }
          ctx.stroke();
       }

       for (let i = 0; i < count; i++) {
          const p = particles[i];
          p.x += p.xs;
          p.y += p.ys;
          
          if (p.x > canvas.width || p.y > canvas.height) {
             p.x = Math.random() * canvas.width;
             p.y = -20;
          }
       }
       animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [condition]);

  if (condition === 'clear') return null;

  return (
    <canvas 
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // Crucial: lets the map interaction bleed perfectly through
        zIndex: 50 // Rendered above the Deck.gl map but natively beneath all side panels and navigation 
      }}
    />
  );
}
