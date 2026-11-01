import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './DriftWall.css';

const DEFAULT_ITEMS = Array.from({ length: 15 }, (_, index) => ({
  image: `https://picsum.photos/seed/drift-${index}/600/400`,
  title: `Photo ${index + 1}`
}));

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const columnFactor = (index, variance) => 1 + variance * ((((index * 0.6180339887 + 0.35) % 1) * 2) - 1);

const shuffle = (values, random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

export const arrangeWallItems = (items, columns, random = Math.random) => {
  if (!items.length) return Array.from({ length: columns }, () => []);
  const photos = shuffle(items, random);
  const rowOffsets = shuffle(photos.map((_, index) => index), random);
  return Array.from({ length: columns }, (_, column) =>
    rowOffsets.map(offset => photos[(offset + column) % photos.length]));
};

export default function DriftWall({
  items = DEFAULT_ITEMS,
  columns = 5,
  tileWidth = 200,
  tileHeight = 132,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  grayscale = false,
  overlayColor = '#060010',
  className = '',
  style
}) {
  const containerRef = useRef(null);
  const planeRef = useRef(null);
  const trackRefs = useRef([]);
  const rafRef = useRef(null);
  const offsetsRef = useRef([]);
  const velocitiesRef = useRef([]);
  const hoveredColRef = useRef(-1);
  const wallHoveredRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerDampedRef = useRef({ x: 0, y: 0 });
  const lastTsRef = useRef(null);

  const [containerHeight, setContainerHeight] = useState(600);
  const [activeId, setActiveId] = useState(null);
  const activeIdRef = useRef(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => setReduced(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const columnItems = useMemo(() => arrangeWallItems(items, columns), [items, columns]);

  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap;
    return columnItems.map((column) => {
      const copyHeight = Math.max(unit, column.length * unit);
      const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1);
      return { copyHeight, copies };
    });
  }, [columnItems, tileHeight, gap, containerHeight]);

  useLayoutEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height || 600));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const baseVelocities = useMemo(() => {
    const directionSign = direction === 'up' ? 1 : -1;
    return columnItems.map((_, index) => speed * columnFactor(index, variance) * directionSign * (index % 2 === 0 ? 1 : -1));
  }, [columnItems, speed, direction, variance]);

  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, index) => meta.copyHeight * ((index * 0.37) % 1));
    velocitiesRef.current = columnItems.map(() => 0);
  }, [columnMeta, columnItems]);

  const applyPlaneTransform = useCallback((pointerX, pointerY) => {
    if (!planeRef.current) return;
    planeRef.current.style.transform = `translate(-50%, -50%) scale(1.18) rotateX(${tilt + pointerY}deg) rotateY(${turn + pointerX}deg) rotateZ(${roll}deg) translateZ(${-depth}px)`;
  }, [tilt, turn, roll, depth]);

  useEffect(() => {
    if(reduced){applyPlaneTransform(0,0);return;}
    const animate = (timestamp) => {
      if(document.hidden){rafRef.current=null;return;}
      if (lastTsRef.current === null) lastTsRef.current = timestamp;
      const delta = Math.min(0.05, Math.max(0, timestamp - lastTsRef.current) / 1000);
      lastTsRef.current = timestamp;

      const maxTilt = parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      const damping = 1 - Math.exp(-delta / 0.12);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damping;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damping;
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

      for (let index = 0; index < trackRefs.current.length; index += 1) {
        const meta = columnMeta[index];
        const track = trackRefs.current[index];
        if (!track || !meta) continue;
        if (!reduced) {
          const isPaused = (wallHoveredRef.current && pauseOnHover) || hoveredColRef.current === index;
          const targetVelocity = baseVelocities[index] * (isPaused ? 0 : 1);
          const easing = 1 - Math.exp(-delta / (targetVelocity === 0 ? 0.16 : 0.28));
          velocitiesRef.current[index] += (targetVelocity - velocitiesRef.current[index]) * easing;
          const next = (offsetsRef.current[index] ?? 0) + velocitiesRef.current[index] * delta;
          offsetsRef.current[index] = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
        }
        track.style.transform = `translate3d(0, ${-(offsetsRef.current[index] ?? 0)}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    const resume=()=>{if(!document.hidden && !rafRef.current){lastTsRef.current=null;rafRef.current=requestAnimationFrame(animate);}};
    document.addEventListener('visibilitychange',resume);
    return () => {
      document.removeEventListener('visibilitychange',resume);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [applyPlaneTransform, baseVelocities, columnMeta, parallax, pauseOnHover, reduced]);

  const activate = useCallback((id, index) => {
    activeIdRef.current = id;
    hoveredColRef.current = index;
    setActiveId(id);
  }, []);

  const release = useCallback(() => {
    activeIdRef.current = null;
    hoveredColRef.current = -1;
    setActiveId(null);
  }, []);

  const handlePointerMove = useCallback((event) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (parallax > 0 && !reduced) {
      pointerRef.current = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
    }
    const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-tile-id]');
    if (!tile || tile.dataset.tileId === activeIdRef.current) return;
    activate(tile.dataset.tileId, Number(tile.dataset.col));
  }, [activate, parallax, reduced]);

  const cssVars = useMemo(() => ({
    '--dw-tile-w': `${tileWidth}px`, '--dw-tile-h': `${tileHeight}px`, '--dw-gap': `${gap}px`, '--dw-radius': `${radius}px`, '--dw-perspective': `${perspective}px`, '--dw-lift': `${lift}px`, '--dw-dim': dim, '--dw-gray': grayscale ? 1 : 0, '--dw-overlay': overlayColor, '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`, ...style
  }), [tileWidth, tileHeight, gap, radius, perspective, lift, dim, grayscale, overlayColor, fade, style]);

  const renderTile = (item, id, columnIndex) => (
    <div key={id} tabIndex={0} role="button" aria-label={item.title ?? 'Photo'} aria-pressed={activeId===id} onClick={()=>activeId===id?release():activate(id,columnIndex)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activeId===id?release():activate(id,columnIndex);}}} className={'drift-wall__tile' + (item.id && !item.id.startsWith('moment-') ? ' drift-wall__tile--uploaded' : '') + (activeId === id ? ' is-active' : '')} data-tile-id={id} data-col={columnIndex} onFocus={() => activate(id, columnIndex)} onBlur={release}>
      <span className="drift-wall__inner"><img src={item.image} alt={item.title ?? ''} loading="lazy" decoding="async" draggable={false} /><span className="drift-wall__overlay" aria-hidden="true" /></span>
    </div>
  );

  return (
    <div ref={containerRef} className={['drift-wall', reduced ? 'drift-wall--reduced' : '', className].filter(Boolean).join(' ')} style={cssVars} onPointerMove={handlePointerMove} onPointerEnter={() => { wallHoveredRef.current = true; }} onPointerLeave={() => { wallHoveredRef.current = false; pointerRef.current = { x: 0, y: 0 }; release(); }} role="group" aria-label="Training photo wall">
      <div ref={planeRef} className="drift-wall__plane">
        {columnItems.map((column, columnIndex) => {
          const meta = columnMeta[columnIndex];
          return <div className="drift-wall__col" key={'column-' + columnIndex}><div className="drift-wall__track" ref={(element) => { trackRefs.current[columnIndex] = element; }}>{Array.from({ length: meta.copies }).map((_, copyIndex) => column.map((item, itemIndex) => renderTile(item, `${columnIndex}-${copyIndex}-${itemIndex}`, columnIndex)))}</div></div>;
        })}
      </div>
    </div>
  );
}
