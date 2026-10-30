import { useEffect, useState } from 'react';

export default function FoodAccordion({ items }) {
  const [activeIndex, setActiveIndex] = useState(Math.max(items.length - 1, 0));

  useEffect(() => {
    setActiveIndex(Math.max(items.length - 1, 0));
  }, [items.length]);

  const moveFocus = (event, index) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    setActiveIndex(nextIndex);
    event.currentTarget.parentElement.querySelectorAll('button')[nextIndex].focus();
  };

  return (
    <aside className="food-gallery card">
      <div className="gallery-heading">
        <div>
          <h3>Today's Food Gallery</h3>
        </div>
        <span className="gallery-count">{items.length} foods</span>
      </div>

      <div className="food-accordion" aria-label="Logged food gallery">
        {items.map((food, index) => {
          const isActive = activeIndex === index;
          const className = ['food-panel', isActive ? 'is-active' : '', index < activeIndex ? 'is-before' : '', food.pendingImage ? 'is-pending' : ''].filter(Boolean).join(' ');
          const photoStyle = food.image ? {
            backgroundImage: 'url("' + food.image.src + '")',
            backgroundPosition: food.image.position,
            backgroundSize: food.image.size
          } : { background: '#11221a' };

          return (
            <button
              className={className}
              type="button"
              key={food.label}
              aria-current={isActive}
              aria-label={food.label}
              title={food.pendingImage ? 'No matching photo available' : 'AI illustration · Not used to calculate nutrition'}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              <span className="food-photo" style={photoStyle} />
              <span className="food-shade" />
              <span className="food-caption">
                <i />
                <span>
                  <strong>{food.label}</strong>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
