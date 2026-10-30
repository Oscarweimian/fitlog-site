import { useMemo, useRef, useState } from 'react';
import DriftWall from './DriftWall';
import { preparePhoto } from '../data/storage';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const initialPhotos = [
  { id: 'moment-1', image: '/images/fitness-media-contact-sheet.webp', title: 'Chest day' },
  { id: 'moment-2', image: '/images/food-accordion-source.webp', title: 'Post-workout meal' },
  { id: 'moment-3', image: '/images/breakfast-food-gallery.webp', title: 'Breakfast log' },
  { id: 'moment-4', image: '/images/anatomy-front-detail.webp', title: 'Training Focus' },
  { id: 'moment-5', image: '/images/anatomy-back-detail.webp', title: 'Back day' },
  { id: 'moment-6', image: '/images/generated-salmon.webp', title: 'Recovery meal' }
];

const monthKey = ({ year, month }) => `${year}-${String(month + 1).padStart(2, '0')}`;

function getMonthDays(year, month) {
  const dayCount = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  return Array.from({ length: leading + dayCount }, (_, index) => {
    if (index < leading) return null;
    const day = index - leading + 1;
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekdayIndex = new Date(year, month, day).getDay();
    const training = weekdayIndex === 0 ? 'Rest' : [1, 3, 5].includes(weekdayIndex) ? 'Sports' : 'Fitness';
    return { date, day, training, weekday: weekdayNames[weekdayIndex] };
  });
}

export { initialPhotos };

export default function CalendarView({ selectedDate, trainingByDate = {}, fitnessLabelsByDate = {}, onOpenDay, photoItems, setPhotoItems }) {
  const [anchor,setAnchor]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [openMonths, setOpenMonths] = useState([monthKey({year:anchor.getFullYear(),month:anchor.getMonth()})]);
  const [uploadNotice, setUploadNotice] = useState('');
  const [uploading,setUploading]=useState(false);
  const uploadInputRef = useRef(null);
  const uploadedPhotos = photoItems.filter((photo) => !photo.id.startsWith('moment-'));
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  const monthDays = useMemo(() => Array.from({length:3},(_,i)=>{const d=new Date(anchor.getFullYear(),anchor.getMonth()-i,1);const year=d.getFullYear(),month=d.getMonth();return {year,month,label:d.toLocaleDateString('en-US',{month:'long',year:'numeric'}),days:getMonthDays(year,month)};}), [anchor]);
  const moveMonth=(offset)=>{const d=new Date(anchor.getFullYear(),anchor.getMonth()+offset,1);setAnchor(d);setOpenMonths([monthKey({year:d.getFullYear(),month:d.getMonth()})]);};

  const toggleMonth = (key) => setOpenMonths((current) => current.includes(key) ? current.filter((item) => item !== key) : current.concat(key));
  const uploadPhotos = async (event) => {
    const files = Array.from(event.target.files || []);event.target.value='';
    if(!files.length)return;
    if(files.length+uploadedPhotos.length>30){setUploadNotice('Maximum 30 uploaded photos.');return;}
    setUploading(true);setUploadNotice('Checking photos…');
    try {
      const additions=[];
      for(const file of files)additions.push(await preparePhoto(file));
      setPhotoItems(current=>additions.concat(current));
      setUploadNotice(`${additions.length} ${additions.length === 1 ? 'photo' : 'photos'} added.`);
    }catch(error){setUploadNotice(error.message+' No photos were added.');}
    finally{setUploading(false);}
  };

  return (
    <main className="calendar-page calendar-page--minimal" id="calendar">
      <section className="calendar-workspace">
        <aside className="calendar-navigator" aria-label="Training calendar months">
          <div className="month-navigation"><button type="button" onClick={()=>moveMonth(-1)} aria-label="Previous month">←</button><button className="month-navigation__current" type="button" onClick={()=>{const d=new Date();setAnchor(new Date(d.getFullYear(),d.getMonth(),1));setOpenMonths([monthKey({year:d.getFullYear(),month:d.getMonth()})]);}} aria-label={`Go to current month, ${currentMonthName}`}>{currentMonthName}</button><button type="button" onClick={()=>moveMonth(1)} aria-label="Next month">→</button></div>
          <div className="month-scroll">
            {monthDays.map((month) => {
              const key = monthKey(month);
              const isOpen = openMonths.includes(key);
              return <section className="month-group" key={key}>
                <button className="month-toggle" type="button" aria-expanded={isOpen} onClick={() => toggleMonth(key)}>
                  <span><b>{month.label}</b></span><svg viewBox="0 0 16 16" aria-hidden="true" className={isOpen ? 'is-open' : ''}><path d="m4 6 4 4 4-4" /></svg>
                </button>
                {isOpen && <div className="calendar-grid" aria-label={`${month.label} ${month.year}`}>
                  {month.days.filter(Boolean).map((defaultDay) => {
                    const day={...defaultDay,training:trainingByDate[defaultDay.date] || defaultDay.training};
                    const displayTraining = day.training === 'Fitness' ? 'Strength Training' : day.training;
                    return <button className={'calendar-day calendar-day--' + day.training + (selectedDate === day.date ? ' is-selected' : '')} type="button" key={day.date} onClick={() => onOpenDay({ ...day, displayTraining, label: new Date(day.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) })}>
                      <span className="calendar-date"><b>{day.day}</b><em>{day.weekday}</em></span><small>{displayTraining}</small>
                    </button>;
                  })}
                </div>}
              </section>;
            })}
          </div>
        </aside>

        <section className="photo-wall-card" aria-label="Training photo wall">
          <details className="photo-menu">
            <summary aria-label="Manage photos" title="Manage photos">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="photo-menu__panel">
              <button className="photo-menu__add" type="button" disabled={uploading} onClick={() => uploadInputRef.current?.click()}>{uploading ? 'Adding photos…' : 'Add photos'}</button>
              <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={uploadPhotos} />
              {uploadNotice && <p className="photo-menu__notice">{uploadNotice}</p>}
              {uploadedPhotos.length ? <div className="photo-menu__list">
                {uploadedPhotos.map((photo) => <div className="photo-menu__item" key={photo.id}>
                  <img src={photo.image} alt="" />
                  <span title={photo.title}>{photo.title}</span>
                  <button type="button" aria-label={`Remove ${photo.title}`} onClick={() => { if (window.confirm('Remove this uploaded photo?')) setPhotoItems((current) => current.filter((item) => item.id !== photo.id)); }}>Remove</button>
                </div>)}
              </div> : <p className="photo-menu__empty">No uploaded photos yet.</p>}
            </div>
          </details>
          <div className="photo-wall-stage">
            <DriftWall items={photoItems} columns={4} tileWidth={158} tileHeight={112} gap={12} radius={10} tilt={9} turn={-8} perspective={1100} depth={82} speed={15} direction="up" variance={0.34} parallax={0.28} lift={44} fade={0.56} dim={0.62} overlayColor="#041108" />
          </div>
          <span className="photo-upload-notice" aria-live="polite">{uploadNotice}</span>
        </section>
      </section>
    </main>
  );
}
