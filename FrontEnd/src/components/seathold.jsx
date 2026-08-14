import React, { useRef, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:4000';

const COLORS = {
  AVAILABLE: '#EAECEF',
  AVAILABLE_BORDER: '#C4C9D0',
  HELD: '#2F80ED',         // Blue: Held by someone else
  BOOKED: '#9E9E9E',       // Grey: Confirmed booked
  SELECTED: '#F84464',     // Red: Selected by you
  HOVER: '#FF6B81',
  TEXT_DARK: '#222222',
  TEXT_MUTED: '#666666',
  BG_CANVAS: '#FAFAFA'
};

export const DEFAULT_CINEMA_LAYOUT = {
  screenLabel: "ALL EYES THIS WAY (SCREEN)",
  canvasDimensions: { width: 840, height: 500 },
  seatDimensions: { width: 30, height: 30, gap: 10 },
  sections: [
    {
      id: "sec_gold",
      title: "GOLD",
      basePrice: 150,
      color: "#D97706",
      startY: 100,
      rows: [
        { label: "A", cols: 15, aisles: [5, 10] },
        { label: "B", cols: 15, aisles: [5, 10] }
      ]
    },
    {
      id: "sec_vip",
      title: "PLATINUM",
      basePrice: 250,
      color: "#F84464",
      startY: 230,
      rows: [
        { label: "C", cols: 15, aisles: [5, 10] },
        { label: "D", cols: 15, aisles: [5, 10] }
      ]
    }
  ]
};

export default function Seatmap({ layout = DEFAULT_CINEMA_LAYOUT, showtimeId = 'SHOW_103' }) {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [socketId, setSocketId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Build grid from JSON layout
  useEffect(() => {
    const parsedSeats = [];
    const { width: seatWidth, height: seatHeight, gap } = layout.seatDimensions;
    const canvasWidth = layout.canvasDimensions.width;

    layout.sections.forEach((section) => {
      let currentY = section.startY;

      section.rows.forEach((rowConfig) => {
        const totalCols = rowConfig.cols;
        const aisles = rowConfig.aisles || [];
        const aisleWidth = 22;

        const totalAisleSpace = aisles.length * aisleWidth;
        const totalSeatsSpace = totalCols * (seatWidth + gap) - gap;
        const startX = (canvasWidth - (totalSeatsSpace + totalAisleSpace)) / 2;

        let accumulatedAisleOffset = 0;

        for (let col = 1; col <= totalCols; col++) {
          if (aisles.includes(col - 1)) {
            accumulatedAisleOffset += aisleWidth;
          }

          const baseX = startX + (col - 1) * (seatWidth + gap) + accumulatedAisleOffset;
          const seatId = `${rowConfig.label}${col}`;

          parsedSeats.push({
            id: seatId,
            row: rowConfig.label,
            col,
            x: baseX,
            y: currentY,
            width: seatWidth,
            height: seatHeight,
            radius: 5,
            status: 'AVAILABLE',
            lockedBy: null,
            tier: section.title,
            price: section.basePrice
          });
        }
        currentY += seatHeight + gap + 8;
      });
    });

    setSeats(parsedSeats);
  }, [layout]);

  // Handle Socket Events
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);
    const socket = socketRef.current;

    socket.on('connect', () => {
      setSocketId(socket.id);
      socket.emit('JOIN_SHOWTIME', { showtimeId });
    });

    socket.on('INITIAL_SEAT_STATES', (seatStates) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) => (seatStates[s.id] ? { ...s, ...seatStates[s.id] } : s))
      );
    });

    socket.on('SEAT_LOCKED', ({ seatId, lockedBy }) => {
      setSeats((prev) =>
        prev.map((s) => (s.id === seatId ? { ...s, status: 'HELD', lockedBy } : s))
      );
    });

    socket.on('SEAT_UNLOCKED', ({ seatId }) => {
      setSeats((prev) =>
        prev.map((s) => (s.id === seatId ? { ...s, status: 'AVAILABLE', lockedBy: null } : s))
      );
    });

    socket.on('LOCK_FAILED', ({ seatId, message }) => {
      triggerToast(`⚠️ ${message}`);
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
      setSeats((prev) =>
        prev.map((s) => (s.id === seatId ? { ...s, status: 'HELD' } : s))
      );
    });

    return () => socket.disconnect();
  }, [showtimeId]);

  // Render Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = layout.canvasDimensions.width;
    const displayHeight = layout.canvasDimensions.height;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = COLORS.BG_CANVAS;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Screen Line
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(displayWidth * 0.25, 20);
    ctx.quadraticCurveTo(displayWidth * 0.5, 40, displayWidth * 0.75, 20);
    ctx.stroke();

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(layout.screenLabel, displayWidth * 0.5, 55);

    // Seats
    seats.forEach((seat) => {
      const isMine = selectedSeatIds.includes(seat.id) || seat.lockedBy === socketId;
      const isHeldByOther = seat.status === 'HELD' && !isMine;
      const isHovered = hoveredSeat?.id === seat.id;

      let fillColor = COLORS.AVAILABLE;
      let textColor = COLORS.TEXT_DARK;

      if (isMine) {
        fillColor = COLORS.SELECTED;
        textColor = '#FFFFFF';
      } else if (isHeldByOther) {
        fillColor = COLORS.HELD;
        textColor = '#FFFFFF';
      } else if (seat.status === 'BOOKED') {
        fillColor = COLORS.BOOKED;
        textColor = '#FFFFFF';
      } else if (isHovered) {
        fillColor = COLORS.HOVER;
        textColor = '#FFFFFF';
      }

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(seat.x, seat.y, seat.width, seat.height, [seat.radius]);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.font = '600 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seat.col, seat.x + seat.width / 2, seat.y + seat.height / 2);
    });

    // Tooltip
    if (hoveredSeat) {
      const isHeldByOther = hoveredSeat.status === 'HELD' && hoveredSeat.lockedBy !== socketId;
      const tooltipText = isHeldByOther
        ? `Seat ${hoveredSeat.id} (Held by another user)`
        : `${hoveredSeat.tier} | Seat ${hoveredSeat.id} | ₹${hoveredSeat.price}`;

      ctx.font = '600 12px sans-serif';
      const textWidth = ctx.measureText(tooltipText).width;
      const ttX = mousePos.x + 10;
      const ttY = mousePos.y - 25;

      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, textWidth + 16, 26, [4]);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tooltipText, ttX + 8, ttY + 13);
    }
  }, [seats, selectedSeatIds, hoveredSeat, mousePos, socketId, layout]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleCanvasClick = () => {
    if (!hoveredSeat) return;

    const seatId = hoveredSeat.id;
    const isMine = selectedSeatIds.includes(seatId);

    if (isMine) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
      socketRef.current.emit('UNLOCK_SEAT', { showtimeId, seatId });
    } else if (hoveredSeat.status === 'AVAILABLE') {
      setSelectedSeatIds((prev) => [...prev, seatId]);
      socketRef.current.emit('LOCK_SEAT', { showtimeId, seatId });
    } else if (hoveredSeat.status === 'HELD') {
      triggerToast('🔒 Seat is locked by another user.');
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });
    const hitSeat = seats.find(
      (s) => x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height
    );

    setHoveredSeat(hitSeat || null);
    canvas.style.cursor = hitSeat && hitSeat.status === 'AVAILABLE' ? 'pointer' : 'default';
  };

  return (
    <div style={{ padding: '20px', background: '#F5F5F7', borderRadius: '12px', fontFamily: 'sans-serif' }}>
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#EF4444', color: '#FFF', padding: '12px 20px', borderRadius: '8px', zIndex: 1000, fontWeight: 'bold' }}>
          {toastMessage}
        </div>
      )}

      <div style={{ background: '#FFF', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          onMouseLeave={() => setHoveredSeat(null)}
        />
        
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 12, background: COLORS.AVAILABLE, borderRadius: 3 }} /> Available</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 12, background: COLORS.SELECTED, borderRadius: 3 }} /> Selected (You)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 12, background: COLORS.HELD, borderRadius: 3 }} /> Held (Others)</span>
        </div>
      </div>
    </div>
  );
}