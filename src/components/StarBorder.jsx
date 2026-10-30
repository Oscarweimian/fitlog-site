import { useEffect, useRef, useState } from 'react';
import './StarBorder.css';

export default function StarBorder({
  as: Component = 'button',
  className = '',
  color = 'white',
  glowSpread = '10%',
  orbit = false,
  speed = '6s',
  thickness = 1,
  backgroundColor = '#000000',
  textColor = '#ffffff',
  borderColor = '#222222',
  children,
  style,
  ...rest
}) {
  const elementRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const animationPlayState = inView && pageVisible ? 'running' : 'paused';

  return (
    <Component
      {...rest}
      ref={elementRef}
      className={`star-border-container ${className}`.trim()}
      style={{ padding: `${thickness}px 0`, ...style }}
    >
      {orbit ? (
        <svg className="star-border-orbit" viewBox="0 0 128 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <rect className="star-orbit-halo" x="2" y="2" width="124" height="40" rx="8" pathLength="100" style={{ stroke: color, animationDuration: speed, animationPlayState }} />
          <rect className="star-orbit-core" x="2" y="2" width="124" height="40" rx="8" pathLength="100" style={{ stroke: color, animationDuration: speed, animationPlayState }} />
        </svg>
      ) : (
        <>
          <span
            className="border-gradient-bottom"
            aria-hidden="true"
            style={{
              background: `radial-gradient(circle, ${color}, transparent ${glowSpread})`,
              animationDuration: speed,
              animationPlayState
            }}
          />
          <span
            className="border-gradient-top"
            aria-hidden="true"
            style={{
              background: `radial-gradient(circle, ${color}, transparent ${glowSpread})`,
              animationDuration: speed,
              animationPlayState
            }}
          />
        </>
      )}
      <span className="inner-content" style={{ background: backgroundColor, color: textColor, borderColor }}>
        {children}
      </span>
    </Component>
  );
}
