import { useEffect, useRef } from 'react';
import './FirstInterface.css';

const BASE_IMAGE = '/images/hero-trunk-shifted-v2-base.webp';
const REVEAL_IMAGE = '/images/hero-trunk-shifted-v2-reveal.webp';

function FirstInterface({ onStart }) {
  const pointer = useRef({ x: -320, y: -320 });
  const smoothPointer = useRef({ x: -320, y: -320 });
  const animationFrame = useRef(null);
  const reveal=useRef(null);

  useEffect(() => {
    const onPointerMove = (event) => {
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden)return;
      pointer.current = { x: event.clientX, y: event.clientY };
      if(!animationFrame.current)animationFrame.current=requestAnimationFrame(animate);
    };

    const animate = () => {
      smoothPointer.current.x += (pointer.current.x - smoothPointer.current.x) * 0.1;
      smoothPointer.current.y += (pointer.current.y - smoothPointer.current.y) * 0.1;
      const {x,y}=smoothPointer.current;
      if(reveal.current){const mask=`radial-gradient(circle 260px at ${x}px ${y}px, #fff 0%, rgba(255,255,255,.95) 23%, rgba(255,255,255,.7) 47%, rgba(255,255,255,.28) 70%, transparent 100%)`;reveal.current.style.maskImage=mask;reveal.current.style.webkitMaskImage=mask;}
      animationFrame.current = !document.hidden && Math.abs(pointer.current.x-x)+Math.abs(pointer.current.y-y)>.5 ? requestAnimationFrame(animate):null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  const spotlightMask = 'radial-gradient(circle 260px at -320px -320px, white, transparent)';

  return (
    <main className="first-hero" aria-label="FitLog Home">
      <div className="first-hero__image first-hero__image--base" style={{ backgroundImage: `url('${BASE_IMAGE}')` }} />
      <div
        ref={reveal}
        className="first-hero__image first-hero__image--reveal"
        style={{ backgroundImage: `url('${REVEAL_IMAGE}')`, maskImage: spotlightMask, WebkitMaskImage: spotlightMask }}
        aria-hidden="true"
      />
      <div className="first-hero__scrim" aria-hidden="true" />

      <section className="first-hero__copy">
        <h1><span>Practice Makes</span><strong>Perfect</strong></h1>
        <p>Training Log</p>
      </section>

      <p className="first-hero__note first-hero__note--left">Look at a cutter hammering away at his rock, perhaps a hundred times without as much as a crack showing in it. Yet at the hundred and first blow it was split into two, and I know it was not the last blow that did it, but all that had gone before.</p>

      <div className="first-hero__note first-hero__note--right">
        <p>Patience is key in life. I&apos;m just taking life one step at a time, one goal at a time. Build a better version of myself, starting from here.</p>
        <button className="first-hero__start" type="button" onClick={onStart}>Start</button>
      </div>
    </main>
  );
}

export default FirstInterface;
