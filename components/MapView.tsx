
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Note, Coordinates } from '../types';

const ChangeView: React.FC<{ center: L.LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && typeof center[0] === 'number' && !isNaN(center[0]) && typeof center[1] === 'number' && !isNaN(center[1])) {
      try {
        map.invalidateSize();
        map.setView(center, zoom);
      } catch (e) {
        console.error("Leaflet setView error:", e);
      }
    } else {
      console.warn("Invalid center passed to ChangeView:", JSON.stringify(center));
    }
  }, [center, zoom, map]);
  return null;
}

// Enhanced user location icon with multiple rings and glow
const userLocationIcon = new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 border-3 border-white shadow-lg" style="box-shadow: 0 0 20px rgba(99, 102, 241, 0.6);"></div>
      <div class="absolute h-8 w-8 rounded-full border-2 border-indigo-400/40 animate-ping"></div>
      <div class="absolute h-12 w-12 rounded-full border-2 border-indigo-300/20 animate-pulse" style="animation-delay: 0.3s;"></div>
    </div>
  `,
  className: 'bg-transparent border-0',
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

// Enhanced 3D marker with shadow and glow effects
const createNoteIcon = (color: string, isActive: boolean) => {
  const baseColor = color.replace('text-', '').replace('-400', '');
  const shadowIntensity = isActive ? '0 6px 20px' : '0 2px 8px';
  const colorMap: { [key: string]: string } = {
    'blue': '#3b82f6',
    'green': '#10b981',
    'yellow': '#f59e0b',
    'purple': '#a855f7',
    'indigo': '#6366f1',
    'red': '#ef4444',
    'pink': '#ec4899'
  };
  const hexColor = colorMap[baseColor] || '#6366f1';

  return new L.DivIcon({
    html: `
          <div class="relative transition-all duration-300 ease-out" style="transform: ${isActive ? 'scale(1.2) translateY(-4px)' : 'scale(1)'};">
            <div class="absolute inset-0 blur-md opacity-40 rounded-full" style="background: ${hexColor}; transform: translateY(20px) scale(0.8);"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${hexColor}" class="w-10 h-10 relative transition-all duration-300" style="filter: drop-shadow(${shadowIntensity} rgba(0, 0, 0, 0.3)) ${isActive ? `drop-shadow(0 0 12px ${hexColor})` : ''};">
              <defs>
                <linearGradient id="grad-${baseColor}" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:${hexColor};stop-opacity:1" />
                  <stop offset="100%" style="stop-color:${hexColor};stop-opacity:0.7" />
                </linearGradient>
              </defs>
              <path fill="url(#grad-${baseColor})" fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 005.169-4.418c1.558-2.209 2.221-4.664 2.221-7.149C20 6.065 16.418 3 12 3S4 6.065 4 10.5c0 2.485.663 4.94 2.22 7.149a16.975 16.975 0 005.17 4.418zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clip-rule="evenodd" />
            </svg>
            ${isActive ? `<div class="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full animate-ping opacity-30" style="background: ${hexColor};"></div>` : ''}
          </div>
        `,
    className: 'bg-transparent border-0',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Premium map tile URLs with better styling
const mapUrls = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

// Enhanced popup styling component
const EnhancedPopup: React.FC<{ note: Note }> = ({ note }) => {
  const categoryColor = note.category?.color || 'bg-indigo-500';
  const bgColor = categoryColor.replace('bg-', '').replace('-500', '');

  return (
    <div className="min-w-[200px] max-w-[280px]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div className={`absolute top-0 left-0 right-0 h-1 ${categoryColor}`}></div>
        <div className="p-4 pt-3">
          <div className="flex items-start gap-2 mb-2">
            {note.category && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor} bg-opacity-10 text-gray-900 dark:text-white border border-current border-opacity-20`}>
                {note.category.name}
              </span>
            )}
          </div>
          <h4 className="font-bold text-base text-gray-900 dark:text-white mb-2 leading-tight">{note.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
            {note.content.substring(0, 120)}{note.content.length > 120 ? '...' : ''}
          </p>
          {note.location && (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {note.location.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoized marker component
const NoteMarker = React.memo(({ note, isActive, onClick }: { note: Note, isActive: boolean, onClick: (id: string) => void }) => {
  if (!note.location) return null;

  const categoryColor = note.category?.color.replace('bg-', 'text-').replace('-500', '-400') || 'text-indigo-400';
  const icon = createNoteIcon(categoryColor, isActive);

  return (
    <Marker
      position={[note.location.coordinates.latitude, note.location.coordinates.longitude]}
      icon={icon}
      zIndexOffset={isActive ? 1000 : 0}
      eventHandlers={{
        click: () => onClick(note.id),
      }}
    >
      <Popup
        className="custom-popup"
        closeButton={true}
        autoClose={false}
        closeOnClick={false}
      >
        <EnhancedPopup note={note} />
      </Popup>
    </Marker>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.category?.id === nextProps.note.category?.id &&
    prevProps.note.location?.coordinates.latitude === nextProps.note.location?.coordinates.latitude &&
    prevProps.note.location?.coordinates.longitude === nextProps.note.location?.coordinates.longitude
  );
});

interface MapViewProps {
  notes: Note[];
  userLocation: Coordinates | null;
  activeNoteId?: string | null;
  onMarkerClick: (noteId: string) => void;
  theme: 'light' | 'dark';
}

const MapView: React.FC<MapViewProps> = ({ notes, userLocation, activeNoteId, onMarkerClick, theme }) => {
  const isValidCoordinate = (lat: number | undefined, lng: number | undefined): boolean => {
    return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
  };

  const notesWithLocation = useMemo(() =>
    notes.filter(n => n.location && isValidCoordinate(n.location.coordinates.latitude, n.location.coordinates.longitude)),
    [notes]);

  const center: L.LatLngExpression = useMemo(() => {
    if (userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude)) {
      return [userLocation.latitude, userLocation.longitude];
    }
    if (notesWithLocation.length > 0 && notesWithLocation[0].location) {
      return [notesWithLocation[0].location.coordinates.latitude, notesWithLocation[0].location.coordinates.longitude];
    }
    return [51.505, -0.09];
  }, [userLocation, notesWithLocation]);



  return (
    <div className="relative rounded-xl h-[60vh] overflow-hidden group">
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-400/30 dark:via-purple-400/30 dark:to-pink-400/30 rounded-xl p-[2px] z-0">
        <div className="h-full w-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            zoomControl={true}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <ChangeView center={center} zoom={13} />
            <TileLayer
              key={theme}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={mapUrls[theme]}
              className="map-tiles"
            />

            {userLocation && isValidCoordinate(userLocation.latitude, userLocation.longitude) && (
              <>
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  icon={userLocationIcon}
                  zIndexOffset={2000}
                >
                  <Popup>
                    <div className="text-center font-medium text-sm px-2 py-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-gray-900 dark:text-white">You are here</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[userLocation.latitude, userLocation.longitude]}
                  radius={100}
                  pathOptions={{
                    fillColor: '#6366f1',
                    fillOpacity: 0.1,
                    color: '#6366f1',
                    opacity: 0.3,
                    weight: 2
                  }}
                />
              </>
            )}

            {notesWithLocation.map(note => (
              <NoteMarker
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onClick={onMarkerClick}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Corner badge */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {notesWithLocation.length} {notesWithLocation.length === 1 ? 'Note' : 'Notes'}
        </p>
      </div>

      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0.5rem !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          min-width: 200px !important;
        }
        .custom-popup .leaflet-popup-tip-container {
          display: none !important;
        }
        .map-tiles {
          filter: ${theme === 'dark' ? 'brightness(0.9) contrast(1.1) saturate(1.2)' : 'brightness(1.05) contrast(1.05) saturate(1.1)'};
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-popup {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MapView;
