import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Note, Coordinates } from '../types';

const ChangeView: React.FC<{ center: L.LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const userLocationIcon = new L.DivIcon({
  html: `<div class="relative flex items-center justify-center">
           <div class="absolute h-4 w-4 rounded-full bg-indigo-500 border-2 border-white"></div>
           <div class="h-6 w-6 rounded-full bg-indigo-500/50 animate-ping"></div>
         </div>`,
  className: 'bg-transparent border-0',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const noteIcon = (color = 'text-gray-400', isActive = false) => {
    const scaleClass = isActive ? 'scale-125' : 'scale-100';
    const dropShadow = isActive ? 'drop-shadow(0 0 5px rgb(129 140 248 / 0.8))' : '';
    return new L.DivIcon({
        html: `<div class="transition-transform duration-200 ${scaleClass}" style="filter: ${dropShadow};">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 ${color}">
                    <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 005.169-4.418c1.558-2.209 2.221-4.664 2.221-7.149C20 6.065 16.418 3 12 3S4 6.065 4 10.5c0 2.485.663 4.94 2.22 7.149a16.975 16.975 0 005.17 4.418zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clip-rule="evenodd" />
                </svg>
               </div>`,
        className: 'bg-transparent border-0',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
};

const mapUrls = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

interface MapViewProps {
  notes: Note[];
  userLocation: Coordinates | null;
  activeNoteId?: string | null;
  onMarkerClick: (noteId: string) => void;
  theme: 'light' | 'dark';
}

const MapView: React.FC<MapViewProps> = ({ notes, userLocation, activeNoteId, onMarkerClick, theme }) => {
  const notesWithLocation = notes.filter(n => n.location);

  const center: L.LatLngExpression = userLocation 
    ? [userLocation.latitude, userLocation.longitude] 
    : (notesWithLocation.length > 0 
        ? [notesWithLocation[0].location.coordinates.latitude, notesWithLocation[0].location.coordinates.longitude]
        : [51.505, -0.09]);

  return (
    <div className="bg-gray-200 dark:bg-slate-700 rounded-lg h-[60vh] overflow-hidden shadow-lg border border-gray-300 dark:border-slate-600 relative z-0">
      <MapContainer center={center} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <ChangeView center={center} zoom={13} />
        <TileLayer
          key={theme} // Force re-render of TileLayer on theme change
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={mapUrls[theme]}
        />
        
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userLocationIcon} zIndexOffset={1000}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        
        {notesWithLocation.map(note => {
          const isActive = note.id === activeNoteId;
          const categoryColor = note.category?.color.replace('bg-', 'text-').replace('-500', '-400') || 'text-indigo-400';
          return (
            <Marker
              key={note.id}
              position={[note.location.coordinates.latitude, note.location.coordinates.longitude]}
              icon={noteIcon(categoryColor, isActive)}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{
                click: () => onMarkerClick(note.id),
              }}
            >
              <Popup>
                 <div className="p-1 text-gray-800" style={{fontFamily: 'sans-serif'}}>
                  <h4 className="font-bold text-base mb-1">{note.title}</h4>
                  <p className="text-sm">{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;