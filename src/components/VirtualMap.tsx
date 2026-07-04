import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Info, Users, CheckCircle, Clock, AlertOctagon, HelpCircle } from 'lucide-react';
import { Complaint } from '../types';

interface VirtualMapProps {
  complaints: Complaint[];
  selectedComplaintId?: string;
  onSelectComplaint?: (id: string) => void;
  onPickLocation?: (gps: { lat: number; lng: number }, address: string) => void;
  interactive?: boolean;
  pickedGps?: { lat: number; lng: number };
  showHeatmap?: boolean;
  height?: string;
}

// Fixed bounds representing virtual municipal area (Chennai-like simulated district)
const MAP_LAT_MIN = 13.0600;
const MAP_LAT_MAX = 13.1000;
const MAP_LNG_MIN = 80.2500;
const MAP_LNG_MAX = 80.2900;

export default function VirtualMap({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  onPickLocation,
  interactive = false,
  pickedGps,
  showHeatmap = false,
  height = 'h-96',
}: VirtualMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredMarker, setHoveredMarker] = useState<Complaint | null>(null);

  // Translate GPS Coordinates to Pixel %
  const getXY = (lat: number, lng: number) => {
    const latRange = MAP_LAT_MAX - MAP_LAT_MIN;
    const lngRange = MAP_LNG_MAX - MAP_LNG_MIN;

    // Y increases downwards in pixel space, while Latitude increases upwards
    const x = ((lng - MAP_LNG_MIN) / lngRange) * 100;
    const y = (1 - (lat - MAP_LAT_MIN) / latRange) * 100;

    return { x: Math.min(Math.max(x, 2), 98), y: Math.min(Math.max(y, 2), 98) };
  };

  // Translate Pixel X, Y % to GPS coordinates
  const getGPS = (percentX: number, percentY: number) => {
    const latRange = MAP_LAT_MAX - MAP_LAT_MIN;
    const lngRange = MAP_LNG_MAX - MAP_LNG_MIN;

    const lng = MAP_LNG_MIN + (percentX / 100) * lngRange;
    const lat = MAP_LAT_MIN + (1 - percentY / 100) * latRange;

    return {
      lat: parseFloat(lat.toFixed(5)),
      lng: parseFloat(lng.toFixed(5)),
    };
  };

  // Draw Heatmap on Canvas if enabled
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!showHeatmap) return;

    // Paint an alpha semi-dark canvas for contrast
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, width, height);

    // Draw radial blur fields for active complaints
    complaints.forEach(complaint => {
      if (complaint.status === 'completed' || complaint.status === 'rejected') return;

      const { x: px, y: py } = getXY(complaint.gps.lat, complaint.gps.lng);
      const x = (px / 100) * width;
      const y = (py / 100) * height;

      // Radius is proportional to priority score
      const radius = 35 + (complaint.priorityScore / 100) * 45;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      
      // Color based on severity & priority
      let r = 239, g = 68, b = 68; // Critical Red
      if (complaint.priority === 'high') {
        r = 249; g = 115; b = 22; // Orange
      } else if (complaint.priority === 'medium') {
        r = 234; g = 179; b = 8; // Yellow
      } else if (complaint.priority === 'low') {
        r = 59; g = 130; b = 246; // Blue
      }

      // Heat dissipation gradient
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`);
      grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.4)`);
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [complaints, showHeatmap]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onPickLocation || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = (clickX / rect.width) * 100;
    const percentY = (clickY / rect.height) * 100;

    const coords = getGPS(percentX, percentY);
    
    // Reverse geocode mock
    const avenues = ['Anna Salai', 'Mount Road', 'Poonamallee High Rd', 'GST Road', 'Sardar Patel Rd', 'Arcot Rd', 'OMR Corridor'];
    const sectors = ['Sector 1, Shastri Nagar', 'Sector 3, Mylapore', 'Sector 5, Adyar', 'Nungambakkam District', 'Velachery Main Ring', 'T-Nagar Commercial Zone'];
    const randomAve = avenues[Math.floor((coords.lat * 100) % avenues.length)];
    const randomSec = sectors[Math.floor((coords.lng * 100) % sectors.length)];
    const simulatedAddress = `${Math.floor(10 + coords.lat * 1000 % 240)}, ${randomAve}, Near Park Side, ${randomSec}, Chennai`;

    onPickLocation(coords, simulatedAddress);
  };

  const getStatusColor = (complaint: Complaint) => {
    if (complaint.status === 'completed') return 'bg-emerald-500 border-white text-white shadow-emerald-200';
    if (complaint.status === 'rejected') return 'bg-gray-400 border-white text-white shadow-gray-200';
    
    // SLA Breaches / Escalated
    if (complaint.isEscalated) return 'bg-red-600 border-yellow-400 animate-pulse text-white shadow-red-300 border-2';
    
    if (complaint.priority === 'critical') return 'bg-red-500 border-white text-white shadow-red-200';
    if (complaint.priority === 'high') return 'bg-amber-500 border-white text-white shadow-amber-200';
    if (complaint.priority === 'medium') return 'bg-yellow-400 border-white text-slate-800 shadow-yellow-100';
    return 'bg-blue-500 border-white text-white shadow-blue-100';
  };

  const selectedXY = pickedGps ? getXY(pickedGps.lat, pickedGps.lng) : null;

  return (
    <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 flex flex-col">
      {/* Map Control Bar */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-white text-xs select-none">
        <span className="flex items-center font-mono tracking-tight gap-1.5">
          <MapPin className="w-4 h-4 text-sky-400" />
          CIVIC-GIS VIRTUAL MAP MODULE v4.2
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Critical
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> High
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> Medium
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Resolved
          </div>
          <span className="text-slate-400 font-mono">Zoom: 1.0x</span>
        </div>
      </div>

      {/* Map Body container */}
      <div
        id="gis-canvas-wrapper"
        ref={containerRef}
        onClick={handleMapClick}
        className={`relative w-full ${height} overflow-hidden cursor-crosshair select-none bg-sky-50`}
        style={{
          backgroundImage: `
            radial-gradient(#cbd5e1 1px, transparent 1px), 
            linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 120px 120px, 120px 120px',
        }}
      >
        {/* Mock Streets/Borders for realistic government visual design */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute left-[30%] top-0 bottom-0 w-8 bg-slate-200 border-l border-r border-slate-300"></div>
          <div className="absolute left-0 right-0 top-[40%] h-8 bg-slate-200 border-t border-b border-slate-300"></div>
          <div className="absolute left-[70%] top-0 bottom-0 w-6 bg-slate-200 border-l border-r border-slate-300"></div>
          <div className="absolute left-0 right-0 top-[75%] h-6 bg-slate-200 border-t border-b border-slate-300 font-mono text-[9px] text-slate-400 pl-4 pt-1">SH-49 GST EXPRESSWAY</div>
          {/* Water Bodies */}
          <div className="absolute left-[10%] top-[10%] w-32 h-16 bg-sky-200 rounded-full blur-sm opacity-60"></div>
          <div className="absolute right-[5%] bottom-[15%] w-48 h-24 bg-sky-200 rounded-full blur-sm opacity-60"></div>
          {/* Parks */}
          <div className="absolute left-[50%] top-[60%] w-40 h-20 bg-emerald-100 rounded border border-emerald-200 opacity-75 flex items-center justify-center text-[10px] text-emerald-600 font-medium font-sans">Municipal Eco Park</div>
          <div className="absolute left-[15%] top-[55%] w-16 h-16 bg-emerald-100 rounded-full border border-emerald-200 opacity-65"></div>
        </div>

        {/* Heatmap Layer Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Picked Location Crosshair (Interactive Mode) */}
        {selectedXY && (
          <div
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${selectedXY.x}%`, top: `${selectedXY.y}%` }}
          >
            <div className="w-10 h-10 border-2 border-dashed border-sky-600 rounded-full animate-ping absolute"></div>
            <MapPin className="w-8 h-8 text-sky-600 drop-shadow-md animate-bounce" />
            <div className="bg-slate-900/90 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
              PICKED GPS: {pickedGps?.lat}, {pickedGps?.lng}
            </div>
          </div>
        )}

        {/* Render Complaints Markers */}
        {!showHeatmap && complaints.map(c => {
          const { x, y } = getXY(c.gps.lat, c.gps.lng);
          const isSelected = selectedComplaintId === c.id;

          return (
            <div
              key={c.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectComplaint) onSelectComplaint(c.id);
              }}
              onMouseEnter={() => setHoveredMarker(c)}
              onMouseLeave={() => setHoveredMarker(null)}
            >
              <div className={`p-1.5 rounded-full border shadow-md flex items-center justify-center transition-all ${getStatusColor(c)} ${isSelected ? 'ring-4 ring-offset-2 ring-slate-900 scale-110 z-30' : ''}`}>
                <MapPin className="w-3.5 h-3.5" />
              </div>

              {/* Individual Label */}
              {isSelected && (
                <div className="absolute top-7 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg font-mono font-medium whitespace-nowrap">
                  {c.id}
                </div>
              )}
            </div>
          );
        })}

        {/* Informational overlay for Picker */}
        {interactive && (
          <div className="absolute top-3 left-3 bg-white/95 border border-slate-200 p-2 rounded-lg shadow-md z-30 max-w-xs text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800 flex items-center gap-1 mb-1">
              <Info className="w-3.5 h-3.5 text-sky-600" /> Map Picker Activated
            </span>
            Click anywhere on the grid surface to auto-detect location GPS and geocode address.
          </div>
        )}
      </div>

      {/* Hover Marker Tooltip details (Standard view) */}
      {hoveredMarker && !showHeatmap && (
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 text-white p-3 rounded-lg shadow-xl z-40 flex items-center justify-between text-xs transition-opacity animate-fadeIn border border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded text-[10px] font-semibold">{hoveredMarker.id}</span>
              <span className="font-semibold text-slate-100">{hoveredMarker.title}</span>
            </div>
            <p className="text-slate-300 text-[11px] truncate max-w-md">{hoveredMarker.address}</p>
            <div className="flex items-center gap-3 mt-1.5 text-slate-400 text-[10px]">
              <span className="flex items-center gap-1 capitalize"><Clock className="w-3 h-3" /> {hoveredMarker.status.replace('_', ' ')}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Supports: {hoveredMarker.supportersCount}</span>
              <span className="bg-slate-800 text-slate-300 px-1 py-0.2 rounded text-[9px]">Priority: {hoveredMarker.priorityScore}/100</span>
            </div>
          </div>
          <button
            onClick={() => onSelectComplaint?.(hoveredMarker.id)}
            className="bg-sky-500 hover:bg-sky-400 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer"
          >
            Inspect Details
          </button>
        </div>
      )}

      {/* Geolocation status / coordinates footer */}
      <div className="bg-slate-100 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono flex items-center justify-between select-none">
        <span>BOUNDS: [{MAP_LAT_MIN.toFixed(4)}N, {MAP_LNG_MIN.toFixed(4)}E] TO [{MAP_LAT_MAX.toFixed(4)}N, {MAP_LNG_MAX.toFixed(4)}E]</span>
        <span>MUNICIPAL GPS TRACKER STATUS: CONNECTED</span>
      </div>
    </div>
  );
}
