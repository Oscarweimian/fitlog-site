import { useEffect, useState } from 'react';

const FOODS_PER_ROW = 5;
const rowsFor = items => Array.from(
  { length: Math.max(1, Math.ceil(items.length / FOODS_PER_ROW)) },
  (_, row) => items.slice(row * FOODS_PER_ROW, (row + 1) * FOODS_PER_ROW)
);

export default function FoodAccordion({ items }) {
  const rows = rowsFor(items);
  const [activeByRow, setActiveByRow] = useState(() => rows.map(row => Math.max(row.length - 1, 0)));

  useEffect(() => {
    setActiveByRow(rowsFor(items).map(row => Math.max(row.length - 1, 0)));
  }, [items.length]);

  const activate = (row, index) => setActiveByRow(current => {
    if (current[row] === index) return current;
    const next = current.slice();
    next[row] = index;
    return next;
  });

  const moveFocus = (event, index) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    activate(Math.floor(nextIndex / FOODS_PER_ROW), nextIndex % FOODS_PER_ROW);
    event.currentTarget.closest('.food-accordion-list').querySelectorAll('.food-panel')[nextIndex].focus();
  };

  return (
    <aside className="food-gallery card">
      <div className="gallery-heading">
        <div>
          <h3>Today's Food Gallery</h3>
        </div>
        <span className="gallery-count">{items.length} foods</span>
      </div>

      <div className="food-accordion-list" role="group" aria-label="Logged food gallery">
        {rows.map((row, rowIndex) => <div className="food-accordion" key={rowIndex}>
        {row.map((food, index) => {
          const isActive = activeByRow[rowIndex] === index;
          const absoluteIndex = rowIndex * FOODS_PER_ROW + index;
          const className = ['food-panel', isActive ? 'is-active' : '', index < activeByRow[rowIndex] ? 'is-before' : '', food.pendingImage ? 'is-pending' : ''].filter(Boolean).join(' ');
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
              onMouseEnter={() => activate(rowIndex, index)}
              onFocus={() => activate(rowIndex, index)}
              onClick={() => activate(rowIndex, index)}
              onKeyDown={(event) => moveFocus(event, absoluteIndex)}
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
        </div>)}
      </div>
    </aside>
  );
}
