import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TeacherMapProps {
  data: any[];
}

const BoundsWrapper = ({ data }: { data: any[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (data.length > 0) {
      const bounds = L.latLngBounds(data.map(d => [parseFloat(d.lat), parseFloat(d.lon)]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [data, map]);
  
  return null;
};

const TeacherMap: React.FC<TeacherMapProps> = ({ data }) => {
  const validData = data.filter(d => d.lat && d.lon && !isNaN(parseFloat(d.lat)) && !isNaN(parseFloat(d.lon)));

  if (validData.length === 0) {
    return <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '0.75rem' }}>No location data available</div>;
  }

  const center = [parseFloat(validData[0].lat), parseFloat(validData[0].lon)] as [number, number];

  return (
    <div style={{ height: '320px', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {validData.map((marker, index) => (
          <Marker 
            key={`${marker.id}-${index}`} 
            position={[parseFloat(marker.lat), parseFloat(marker.lon)]}
          >
            <Popup>
              <div style={{ padding: '0.5rem', minWidth: '150px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {marker.teacher?.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={marker.teacher.avatar} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
                      {marker.teacher?.name ? marker.teacher.name.charAt(0) : 'T'}
                    </div>
                  )}
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>{marker.teacher?.name || 'Unknown Teacher'}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>{marker.teacherId.substring(0,8)}</p>
                  </div>
                </div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Status: <span style={{ textTransform: 'capitalize' }}>{marker.status}</span></p>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Date: {new Date(marker.date).toLocaleDateString()}</p>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Time: {new Date(marker.time).toLocaleTimeString()}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6366f1', fontWeight: 500 }}>Distance: {parseFloat(marker.distanceFromCenter).toFixed(2)}m</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <BoundsWrapper data={validData} />
      </MapContainer>
    </div>
  );
};

export default TeacherMap;
