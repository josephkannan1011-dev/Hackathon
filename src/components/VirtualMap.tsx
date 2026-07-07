import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, Info, Users, Clock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Complaint } from '../types';

interface VirtualMapProps {
  complaints: Complaint[];
  selectedComplaintId?: string;
  onSelectComplaint?: (id: string) => void;
  onPickLocation?: (gps: { lat: number; lng: number }, address: string, state?: string, district?: string) => void;
  interactive?: boolean;
  pickedGps?: { lat: number; lng: number };
  height?: string;
}

// Custom Leaflet pin generator using SVG markup directly to avoid Vite path bundling issues
const createCustomPinIcon = (priority: string, status: string, isSelected: boolean) => {
  let color = '#3b82f6'; // Default Low/Medium Priority
  if (status === 'completed') color = '#10b981'; // Green for resolved
  else if (status === 'rejected') color = '#64748b'; // Slate gray for rejected
  else if (priority === 'critical') color = '#ef4444'; // Red for critical
  else if (priority === 'high') color = '#f59e0b'; // Amber for high

  const size = isSelected ? 34 : 26;
  const borderStyle = isSelected ? 'stroke: #ffffff; stroke-width: 2.5;' : 'stroke: #020617; stroke-width: 1.5;';

  return L.divIcon({
    className: 'custom-leaflet-marker-div',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" style="${borderStyle} filter: drop-shadow(0px 2.5px 4px rgba(0,0,0,0.45)); width: ${size}px; height: ${size}px;">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

export default function VirtualMap({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  onPickLocation,
  interactive = false,
  pickedGps,
  height = 'h-96',
}: VirtualMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Search and Location States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [hoveredComplaint, setHoveredComplaint] = useState<Complaint | null>(null);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center of India coords as default starting viewport
    const defaultCenter: L.LatLngExpression = [22.9734, 78.6569];
    const defaultZoom = 5;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // Custom placed or default off for clean layout
      attributionControl: true
    }).setView(defaultCenter, defaultZoom);

    // Standard Zoom Control repositioned to bottom-right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize Markers Group Layer
    const markersGroup = L.layerGroup().addTo(map);

    leafletMapRef.current = map;
    markersGroupRef.current = markersGroup;

    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Force map invalidation/resizing on container changes
  useEffect(() => {
    if (leafletMapRef.current) {
      const timer = setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [height, complaints]);

  // 2. Fly to Picked Coordinates if updated
  useEffect(() => {
    if (leafletMapRef.current && pickedGps) {
      leafletMapRef.current.setView([pickedGps.lat, pickedGps.lng], 14);
    }
  }, [pickedGps]);

  // 3. Handle Map Click Event for Interactive Location Picking
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !interactive || !onPickLocation) return;

    const onMapClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setReverseGeocoding(true);

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: {
            'User-Agent': 'CivicLensApp/1.0'
          }
        });
        const data = await response.json();
        
        const fullAddress = data.display_name || `Coordinate at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const stateName = data.address?.state || '';
        const districtName = data.address?.state_district || data.address?.county || data.address?.district || data.address?.city || '';

        onPickLocation({ lat, lng }, fullAddress, stateName, districtName);
      } catch (err) {
        console.error('Reverse Geocode Failure:', err);
        const fallbackAddress = `Location coordinates: ${lat.toFixed(5)}N, ${lng.toFixed(5)}E`;
        onPickLocation({ lat, lng }, fallbackAddress);
      } finally {
        setReverseGeocoding(false);
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [interactive, onPickLocation]);

  // 4. Update Markers on complaints list / selection / pickedGps changes
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    const map = leafletMapRef.current;
    if (!markersGroup || !map) return;

    markersGroup.clearLayers();

    // A. Render Picked Geolocation pin in interactive mode
    if (interactive && pickedGps) {
      const pickedMarkerIcon = L.divIcon({
        className: 'custom-leaflet-picked-div',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
            <div style="position: absolute; width: 40px; height: 40px; border: 3px dashed #0ea5e9; border-radius: 50%; animation: spin 10s linear infinite; box-shadow: 0 0 10px rgba(14, 165, 233, 0.45);"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0284c7" style="stroke: #ffffff; stroke-width: 2.5px; width: 28px; height: 28px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5));">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      L.marker([pickedGps.lat, pickedGps.lng], { icon: pickedMarkerIcon }).addTo(markersGroup);
    }

    // B. Render Complaints Markers
    complaints.forEach(c => {
      if (!c.gps) return;
      
      const isSelected = selectedComplaintId === c.id;
      const markerIcon = createCustomPinIcon(c.priority, c.status, isSelected);

      const marker = L.marker([c.gps.lat, c.gps.lng], { icon: markerIcon });

      // Add popup or hover actions
      marker.on('click', () => {
        if (onSelectComplaint) {
          onSelectComplaint(c.id);
        }
      });

      marker.on('mouseover', () => {
        setHoveredComplaint(c);
      });

      marker.on('mouseout', () => {
        setHoveredComplaint(null);
      });

      marker.addTo(markersGroup);

      // If this specific complaint is selected, pan the map directly to it
      if (isSelected) {
        map.setView([c.gps.lat, c.gps.lng], 12);
      }
    });

  }, [complaints, selectedComplaintId, pickedGps, interactive, onSelectComplaint]);

  // 5. Place Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      // Direct query restricting search only inside India for safety
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`, {
        headers: {
          'User-Agent': 'CivicLensApp/1.0'
        }
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const firstResult = data[0];
        const lat = parseFloat(firstResult.lat);
        const lng = parseFloat(firstResult.lon);

        if (leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], 13);
        }

        if (interactive && onPickLocation) {
          const stateName = firstResult.address?.state || '';
          const districtName = firstResult.address?.state_district || firstResult.address?.county || firstResult.address?.district || firstResult.address?.city || '';
          onPickLocation({ lat, lng }, firstResult.display_name, stateName, districtName);
        }
      } else {
        alert(`No results found in India for: "${searchQuery}"`);
      }
    } catch (err) {
      console.error('Search failed:', err);
      alert('Network error searching location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // 6. GPS Location handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Your browser does not support GPS geolocation.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        if (leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], 14);
        }

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: {
              'User-Agent': 'CivicLensApp/1.0'
            }
          });
          const data = await response.json();
          const fullAddress = data.display_name || `Current GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const stateName = data.address?.state || '';
          const districtName = data.address?.state_district || data.address?.county || data.address?.district || data.address?.city || '';

          if (interactive && onPickLocation) {
            onPickLocation({ lat, lng }, fullAddress, stateName, districtName);
          }
        } catch (err) {
          console.error('Reverse Geocode failed:', err);
          if (interactive && onPickLocation) {
            onPickLocation({ lat, lng }, `Current GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('GPS extraction error:', error);
        alert('Could not access your GPS location. Please check browser permissions.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/10 flex flex-col bg-slate-950 w-full animate-fadeIn select-none">
      {/* Map Control Bar */}
      <div className="bg-[#0b1329] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between text-white text-[11px] font-medium select-none gap-2">
        <span className="flex items-center gap-1.5 font-mono text-sky-400">
          <MapPin className="w-4 h-4 text-sky-400 animate-pulse" />
          INDIAN NATIONAL GIS GRIEVANCE MAP (LEAFLET-OSM)
        </span>
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block"></span> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block"></span> High</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] inline-block"></span> Medium/Low</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block"></span> Resolved</span>
          </div>
        </div>
      </div>

      {/* Map Display Viewport */}
      <div className="relative w-full overflow-hidden" style={{ height: '100%' }}>
        {/* Leaflet DOM container */}
        <div
          ref={mapContainerRef}
          className={`w-full ${height} z-0`}
          style={{ background: '#0f172a' }}
        />

        {/* Floating Custom Search & GPS Controls Overlay */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search city, district, village..."
            className="bg-slate-950 border border-white/5 text-white text-xs px-2.5 py-1.5 rounded-lg w-44 outline-none focus:ring-1 focus:ring-sky-500/50 text-[11px] font-medium"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold p-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center h-7 w-7"
            title="Search Location"
          >
            <Search className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={gpsLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold p-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center h-7 w-7"
            title="Use Current GPS Coordinates"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        {/* Map Picker Activated Overlay */}
        {interactive && (
          <div className="absolute top-3 left-3 bg-[#0b1329]/95 border border-white/10 p-3 rounded-xl shadow-lg z-[1000] max-w-xs text-[11px] text-slate-300 font-medium backdrop-blur-sm animate-fadeIn">
            <span className="font-semibold text-sky-400 flex items-center gap-1.5 mb-1 font-display">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Interactive Map Picker Active
            </span>
            Click/tap anywhere on the Indian map territory to place your complaint pin. This will reverse-geocode address and route to the local body.
          </div>
        )}

        {/* Reverse Geocoding Loading Indicator */}
        {reverseGeocoding && (
          <div className="absolute inset-0 bg-[#020617]/50 backdrop-blur-3xs flex items-center justify-center z-[1001] animate-fadeIn">
            <div className="bg-slate-900 border border-white/10 px-4 py-2.5 rounded-xl shadow-2xl text-xs text-sky-400 flex items-center gap-2.5 font-semibold font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
              Reverse-geocoding picked location coordinate...
            </div>
          </div>
        )}

        {/* Hover Marker Information HUD Overlay */}
        {hoveredComplaint && (
          <div className="absolute bottom-3 left-3 right-12 bg-slate-950/95 text-white p-3.5 rounded-xl shadow-2xl z-[1000] flex items-center justify-between text-xs animate-fadeIn border border-white/10 backdrop-blur-sm">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono bg-white/10 text-sky-400 border border-white/5 px-2 py-0.5 rounded font-bold text-[9px]">{hoveredComplaint.id}</span>
                <span className="font-bold text-white tracking-tight line-clamp-1 text-[13px] font-display">{hoveredComplaint.title}</span>
              </div>
              <p className="text-slate-300 text-[11px] truncate max-w-sm">📍 {hoveredComplaint.address}</p>
              <div className="flex items-center gap-3.5 text-slate-400 text-[10px] font-semibold pt-0.5">
                <span className="flex items-center gap-1 capitalize"><Clock className="w-3.5 h-3.5 text-slate-400" /> Status: {hoveredComplaint.status.replace('_', ' ')}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> Support: {hoveredComplaint.supportersCount || 1}</span>
                <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] text-slate-300">Priority Score: {hoveredComplaint.priorityScore}/100</span>
              </div>
            </div>
            {onSelectComplaint && (
              <button
                type="button"
                onClick={() => onSelectComplaint(hoveredComplaint.id)}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors cursor-pointer shrink-0"
              >
                Inspect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
