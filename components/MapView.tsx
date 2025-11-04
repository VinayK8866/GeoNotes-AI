import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Note, Coordinates } from '../types';
import { LocationPinIcon } from './Icons';

// Helper component to recenter the map when the user's location changes
const ChangeView: React.FC<{ center: L.LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// Custom icon for the user's current location (pulsating blue dot)
const userLocationIcon = new L.DivIcon({
  html: `<div class="relative flex items-center justify-center">
           <div class="absolute h-4 w-4 rounded-full bg-indigo-500 border-2 border-white"></div>
           <div class="h-6 w-6 rounded-full bg-indigo-500/50 animate-ping"></div>
         </div>`,
  className: 'bg-transparent border-0',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Custom icon for note markers, colored by category
const noteIcon = (color = 'text-gray-400') => new L.DivIcon({
  html: ReactDOMServer.renderToString(
    <LocationPinIcon className={`w-8 h-8 ${color}`} />
  ),
  className: 'bg-transparent border-0',
  iconSize: [32, 32],
  iconAnchor: [16, 32], // Point of the pin
  popupAnchor: [0, -32] // Anchor popup above the pin's point
});


interface MapViewProps {
  notes: Note[];
  userLocation: Coordinates | null;
  activeNoteId?: string | null;
  hasMoreOnlineNotes?: boolean;
}

// FIX: Changed from a named export to a const to allow for a default export.
const MapView: React.FC<MapViewProps> = ({ notes, userLocation, activeNoteId, hasMoreOnlineNotes }) => {
  const notesWithLocation = notes.filter(n => n.location);

  const center: L.LatLngExpression = userLocation 
    ? [userLocation.latitude, userLocation.longitude] 
    : (notesWithLocation.length > 0 
        ? [notesWithLocation[0].location.coordinates.latitude, notesWithLocation[0].location.coordinates.longitude]
        : [51.505, -0.09]); // A default fallback location

  return (
    <div className="bg-slate-700 rounded-lg h-[60vh] overflow-hidden shadow-lg border border-slate-600 relative">
      <MapContainer center={center} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <ChangeView center={center} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userLocationIcon} zIndexOffset={1000}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        
        {notesWithLocation.map(note => {
          const categoryColor = note.category?.color.replace('bg-', 'text-').replace('-500', '-400') || 'text-indigo-400';
          return (
            <Marker
              key={note.id}
              position={[note.location.coordinates.latitude, note.location.coordinates.longitude]}
              icon={noteIcon(categoryColor)}
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
      {hasMoreOnlineNotes && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm shadow-md">
          More notes available. Scroll list view to load.
        </div>
      )}
    </div>
  );
};

// FIX: Added a default export for the component to be compatible with React.lazy.
export default MapView;
