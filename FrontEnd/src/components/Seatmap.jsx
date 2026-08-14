import React, { useRef, useEffect, useState, useCallback } from 'react';

// Default BookMyShow Theme Colors
const COLORS = {
  AVAILABLE: '#EAECEF',
  AVAILABLE_BORDER: '#C4C9D0',
  HELD: '#2F80ED',
  BOOKED: '#9E9E9E',
  SELECTED: '#F84464',
  HOVER: '#FF6B81',
  TEXT_DARK: '#222222',
  TEXT_MUTED: '#666666',
  BG_CANVAS: '#FAFAFA',

  // Specialized Types
  WHEELCHAIR: '#2563EB',
  COMPANION: '#0D9488',
  RECLINER: '#7C3AED'
};

// Default Fallback JSON Layout Schema
export const DEFAULT_CINEMA_LAYOUT = {
  screenLabel: "ALL EYES THIS WAY (SCREEN)",
  canvasDimensions: { width: 840, height: 580 },
  seatDimensions: { width: 30, height: 30, gap: 10 },
  sections: [
    {
      id: "sec_gold",
      title: "GOLD",
      basePrice: 150,
      color: "#D97706",
      startY: 120,
      rows: [
        { label: "A", cols: 15, aisles: [5, 10], curvature: 0 },
        { label: "B", cols: 15, aisles: [5, 10], curvature: 0 }
      ]
    },
    {
      id: "sec_diamond",
      title: "DIAMOND",
      basePrice: 250,
      color: "#0284C7",
      startY: 230,
      rows: [
        { label: "C", cols: 18, aisles: [6, 12], curvature: 0 },
        { label: "D", cols: 18, aisles: [6, 12], curvature: 0 },
        { label: "E", cols: 18, aisles: [6, 12], curvature: 0 },
        { label: "F", cols: 18, aisles: [6, 12], curvature: 0 }
      ]
    },
    {
      id: "sec_vip",
      title: "PLATINUM / VIP",
      basePrice: 350,
      color: "#F84464",
      startY: 440,
      rows: [
        { 
          label: "G", 
          cols: 15, 
          aisles: [5, 10], 
          specialSeats: { 1: "WHEELCHAIR", 2: "COMPANION", 14: "COMPANION", 15: "WHEELCHAIR" } 
        },
        { 
          label: "H", 
          cols: 15, 
          aisles: [5, 10], 
          defaultType: "RECLINER" 
        }
      ]
    }
  ]
};

const generateDynamicDates = () => {
  const dates = [];
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const today = new Date();

  for (let i = 0; i < 5; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);

    dates.push({
      day: i === 0 ? 'TODAY' : daysOfWeek[nextDate.getDay()],
      date: String(nextDate.getDate()).padStart(2, '0'),
      month: months[nextDate.getMonth()],
      fullDate: nextDate.toISOString().split('T')[0]
    });
  }
  return dates;
};

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil'];

const SHOWTIMES = [
  { id: 'SHOW_101', time: '07:30 AM', type: '2D Dolby', surcharge: 0 },
  { id: 'SHOW_102', time: '10:30 AM', type: '2D Atmos', surcharge: 0 },
  { id: 'SHOW_103', time: '03:15 PM', type: '3D Atmos', surcharge: 50 },
  { id: 'SHOW_104', time: '06:00 PM', type: '4DX 3D', surcharge: 150 },
  { id: 'SHOW_105', time: '07:15 PM', type: 'IMAX 2D', surcharge: 100 },
  { id: 'SHOW_106', time: '10:00 PM', type: 'IMAX 3D', surcharge: 150 }
];

export default function Seatmap({ layout = DEFAULT_CINEMA_LAYOUT, onProceedToCheckout }) {
  const canvasRef = useRef(null);
  
  const [datesList] = useState(generateDynamicDates());

  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedDate, setSelectedDate] = useState(datesList[0]);
  const [selectedTime, setSelectedTime] = useState(SHOWTIMES[2]); 
  
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [holdTimer, setHoldTimer] = useState(null);

  // Specialized Seat Warning Modal State
  const [modalData, setModalData] = useState(null);

  const handleSlotChange = (type, value) => {
    if (selectedSeatIds.length > 0) {
      if (!window.confirm("Changing options will reset your selected seats. Proceed?")) {
        return;
      }
    }
    setSelectedSeatIds([]);
    setHoldTimer(null);
    if (type === 'LANG') setSelectedLanguage(value);
    if (type === 'DATE') setSelectedDate(value);
    if (type === 'TIME') setSelectedTime(value);
  };

  // 1. Dynamic Grid Parsing Engine (converts JSON schema to seats array)
  useEffect(() => {
    const parsedSeats = [];
    const currentFormatSurcharge = selectedTime.surcharge || 0;
    const { width: seatWidth, height: seatHeight, gap } = layout.seatDimensions || { width: 30, height: 30, gap: 10 };
    const canvasWidth = layout.canvasDimensions?.width || 840;

    layout.sections.forEach((section) => {
      let currentY = section.startY;

      section.rows.forEach((rowConfig) => {
        const totalCols = rowConfig.cols;
        const aisles = rowConfig.aisles || [];
        const aisleWidth = 22;

        // Calculate total row width for auto-centering
        const totalAisleSpace = aisles.length * aisleWidth;
        const totalSeatsSpace = totalCols * (seatWidth + gap) - gap;
        const rowWidth = totalSeatsSpace + totalAisleSpace;
        const startX = (canvasWidth - rowWidth) / 2;

        let accumulatedAisleOffset = 0;

        for (let col = 1; col <= totalCols; col++) {
          if (aisles.includes(col - 1)) {
            accumulatedAisleOffset += aisleWidth;
          }

          let seatType = rowConfig.defaultType || 'STANDARD';
          if (rowConfig.specialSeats && rowConfig.specialSeats[col]) {
            seatType = rowConfig.specialSeats[col];
          }

          let typeSurcharge = 0;
          if (seatType === 'RECLINER') typeSurcharge = 200;

          const seatPrice = section.basePrice + currentFormatSurcharge + typeSurcharge;

          // Compute dynamic seat X & Y (Support curved layout math)
          const baseX = startX + (col - 1) * (seatWidth + gap) + accumulatedAisleOffset;
          let curveYOffset = 0;

          if (rowConfig.curvature) {
            const midCol = totalCols / 2;
            const distFromCenter = Math.abs(col - midCol);
            curveYOffset = Math.pow(distFromCenter, 1.8) * rowConfig.curvature;
          }

          const seatId = `${rowConfig.label}${col}`;

          parsedSeats.push({
            id: seatId,
            row: rowConfig.label,
            col,
            x: baseX,
            y: currentY + curveYOffset,
            width: seatWidth,
            height: seatHeight,
            radius: 5,
            status: (col === 7 && rowConfig.label === 'C') ? 'BOOKED' : 'AVAILABLE',
            type: seatType,
            tier: section.title,
            price: seatPrice
          });
        }

        currentY += seatHeight + gap + 8;
      });
    });

    setSeats(parsedSeats);
  }, [layout, selectedDate, selectedTime, selectedLanguage]);

  // Render icons inside seats
  const drawSeatIcon = (ctx, seat, textColor) => {
    ctx.strokeStyle = textColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1.5;

    const centerX = seat.x + seat.width / 2;
    const centerY = seat.y + seat.height / 2;

    if (seat.type === 'WHEELCHAIR') {
      ctx.beginPath();
      ctx.arc(centerX, centerY + 2, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY - 5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (seat.type === 'COMPANION') {
      ctx.beginPath();
      ctx.arc(centerX - 3, centerY - 2, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 3, centerY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (seat.type === 'RECLINER') {
      ctx.beginPath();
      ctx.moveTo(centerX - 4, centerY - 5);
      ctx.lineTo(centerX - 2, centerY - 2);
      ctx.lineTo(centerX, centerY - 6);
      ctx.lineTo(centerX + 2, centerY - 2);
      ctx.lineTo(centerX + 4, centerY - 5);
      ctx.lineTo(centerX + 3, centerY + 1);
      ctx.lineTo(centerX - 3, centerY + 1);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.font = '600 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seat.col, centerX, centerY);
    }
  };

  // 2. Direct Canvas Render Engine based on JSON Schema
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = layout.canvasDimensions?.width || 840;
    const displayHeight = layout.canvasDimensions?.height || 580;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);

    // Canvas Background
    ctx.fillStyle = COLORS.BG_CANVAS;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 🎬 Dynamic Screen Label Arc
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(displayWidth * 0.25, 25);
    ctx.quadraticCurveTo(displayWidth * 0.5, 45, displayWidth * 0.75, 25);
    ctx.stroke();

    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = '600 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(layout.screenLabel || 'SCREEN', displayWidth * 0.5, 60);

    // 🏷️ Dynamic Section Header Dividers
    const formatSurcharge = selectedTime.surcharge || 0;
    layout.sections.forEach((section) => {
      const finalPrice = section.basePrice + formatSurcharge;
      ctx.fillStyle = section.color;
      ctx.font = '700 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${section.title} - ₹${finalPrice}`, 40, section.startY - 15);
      
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(180, section.startY - 18);
      ctx.lineTo(displayWidth - 40, section.startY - 18);
      ctx.stroke();
    });

    // Render Seats
    seats.forEach((seat) => {
      const isSelected = selectedSeatIds.includes(seat.id);
      const isHovered = hoveredSeat?.id === seat.id;

      let fillColor = COLORS[seat.status];
      let strokeColor = seat.status === 'AVAILABLE' ? COLORS.AVAILABLE_BORDER : 'transparent';
      let textColor = COLORS.TEXT_DARK;

      if (seat.status === 'AVAILABLE') {
        if (seat.type === 'WHEELCHAIR') strokeColor = COLORS.WHEELCHAIR;
        if (seat.type === 'COMPANION') strokeColor = COLORS.COMPANION;
        if (seat.type === 'RECLINER') strokeColor = COLORS.RECLINER;
      }

      if (isSelected) {
        fillColor = COLORS.SELECTED;
        textColor = '#FFFFFF';
        strokeColor = COLORS.SELECTED;
      } else if (isHovered && seat.status === 'AVAILABLE') {
        fillColor = COLORS.HOVER;
        textColor = '#FFFFFF';
      } else if (seat.status === 'BOOKED' || seat.status === 'HELD') {
        textColor = '#FFFFFF';
      }

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(seat.x, seat.y, seat.width, seat.height, [seat.radius]);
      ctx.fill();

      if (strokeColor !== 'transparent') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = seat.type !== 'STANDARD' && !isSelected ? 2 : 1;
        ctx.stroke();
      }

      drawSeatIcon(ctx, seat, textColor);
    });

    // Row Labels
    ctx.fillStyle = COLORS.TEXT_MUTED;
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const uniqueRows = [...new Set(seats.map(s => s.row))];
    uniqueRows.forEach((row) => {
      const sampleSeat = seats.find(s => s.row === row);
      if (sampleSeat) {
        ctx.fillText(row, sampleSeat.x - 12, sampleSeat.y + sampleSeat.height / 2);
      }
    });

    // Tooltip
    if (hoveredSeat) {
      const tooltipText = `${hoveredSeat.tier} | Seat ${hoveredSeat.id} | ₹${hoveredSeat.price}`;
      ctx.font = '600 12px sans-serif';
      const textWidth = ctx.measureText(tooltipText).width;
      const padding = 8;
      const ttX = mousePos.x + 12;
      const ttY = mousePos.y - 28;

      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, textWidth + padding * 2, 26, [4]);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tooltipText, ttX + padding, ttY + 13);
    }
  }, [seats, selectedSeatIds, hoveredSeat, mousePos, selectedTime, layout]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

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

  const toggleSeatSelection = (seat) => {
    const seatId = seat.id;
    const isAlreadySelected = selectedSeatIds.includes(seatId);

    if (isAlreadySelected) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
    } else {
      if (selectedSeatIds.length >= 6) {
        alert("Maximum 6 seats allowed per order.");
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seatId]);
      if (!holdTimer) setHoldTimer(480);
    }
  };

  const handleCanvasClick = () => {
    if (!hoveredSeat || hoveredSeat.status !== 'AVAILABLE') return;

    if (hoveredSeat.type === 'WHEELCHAIR' && !selectedSeatIds.includes(hoveredSeat.id)) {
      setModalData({
        seat: hoveredSeat,
        title: 'Wheelchair Accessible Space ♿',
        message: 'This space is reserved specifically for patrons using wheelchairs or mobility devices.'
      });
      return;
    }

    if (hoveredSeat.type === 'COMPANION' && !selectedSeatIds.includes(hoveredSeat.id)) {
      setModalData({
        seat: hoveredSeat,
        title: 'Companion Seat Reservation 👥',
        message: 'Companion seats are reserved for individuals accompanying guests in wheelchair-accessible spaces.'
      });
      return;
    }

    toggleSeatSelection(hoveredSeat);
  };

  const confirmModalSelection = () => {
    if (modalData?.seat) {
      toggleSeatSelection(modalData.seat);
    }
    setModalData(null);
  };

  useEffect(() => {
    if (selectedSeatIds.length === 0) {
      setHoldTimer(null);
      return;
    }

    const interval = setInterval(() => {
      setHoldTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          alert("Seat reservation window expired!");
          setSelectedSeatIds([]);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSeatIds]);

  const formatTimer = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalPrice = selectedSeatIds.reduce((sum, id) => {
    const seat = seats.find((s) => s.id === id);
    return sum + (seat ? seat.price : 0);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#F5F5F7', padding: '24px', borderRadius: '12px', color: '#222', maxWidth: '1220px', margin: '0 auto', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {/* Mobility Modal */}
      {modalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#111827' }}>{modalData.title}</h3>
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.5', marginBottom: '20px' }}>{modalData.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setModalData(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmModalSelection} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#F84464', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}>Confirm Selection</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', marginRight: '4px' }}>LANG:</span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSlotChange('LANG', lang)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: selectedLanguage === lang ? '1px solid #F84464' : '1px solid #D1D5DB',
                background: selectedLanguage === lang ? '#F84464' : '#FFFFFF',
                color: selectedLanguage === lang ? '#FFFFFF' : '#4B5563',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {lang}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '28px', background: '#E5E7EB' }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          {datesList.map((item) => (
            <button
              key={item.fullDate}
              onClick={() => handleSlotChange('DATE', item)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 14px',
                borderRadius: '6px',
                border: selectedDate.fullDate === item.fullDate ? '1px solid #F84464' : '1px solid #E5E7EB',
                background: selectedDate.fullDate === item.fullDate ? '#F84464' : '#FFFFFF',
                color: selectedDate.fullDate === item.fullDate ? '#FFFFFF' : '#333333',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: selectedDate.fullDate === item.fullDate ? '#FFFFFF' : '#666666' }}>{item.day}</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.date} {item.month}</span>
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '28px', background: '#E5E7EB' }} />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SHOWTIMES.map((slot) => (
            <button
              key={slot.id}
              onClick={() => handleSlotChange('TIME', slot)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '5px 12px',
                borderRadius: '6px',
                border: selectedTime.id === slot.id ? '1px solid #10B981' : '1px solid #E5E7EB',
                background: selectedTime.id === slot.id ? '#E6F4EA' : '#FFFFFF',
                color: selectedTime.id === slot.id ? '#10B981' : '#333333',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{slot.time}</span>
              <span style={{ fontSize: '9px', color: '#666666', marginTop: '1px' }}>{slot.type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seating Map & Side Summary */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
            onMouseLeave={() => setHoveredSeat(null)}
            style={{ borderRadius: '6px' }}
          />
          
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '18px', fontSize: '11px', color: '#555', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.AVAILABLE, border: `1px solid ${COLORS.AVAILABLE_BORDER}` }} /> Standard
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${COLORS.WHEELCHAIR}`, background: '#FFF' }} /> Wheelchair ♿
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${COLORS.COMPANION}`, background: '#FFF' }} /> Companion 👥
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${COLORS.RECLINER}`, background: '#FFF' }} /> VIP Recliner 👑
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.SELECTED }} /> Selected
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: '280px', background: '#FFFFFF', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', color: '#222' }}>
              Booking Summary
            </h3>
            
            <div style={{ fontSize: '12px', color: '#333', marginBottom: '16px', background: '#FFF5F6', padding: '10px', borderRadius: '6px', border: '1px solid #FFE4E6', lineHeight: '1.5' }}>
              🌐 <strong>{selectedLanguage}</strong> | 📅 <strong>{selectedDate.day}, {selectedDate.date} {selectedDate.month}</strong><br />
              ⏰ <strong>{selectedTime.time}</strong> ({selectedTime.type})
            </div>

            {selectedSeatIds.length === 0 ? (
              <p style={{ color: '#888888', fontSize: '13px' }}>No seats selected yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedSeatIds.map((id) => {
                  const s = seats.find((seat) => seat.id === id);
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333' }}>
                      <span>Seat {id} <small style={{ color: '#888' }}>({s?.type !== 'STANDARD' ? s?.type : s?.tier})</small></span>
                      <strong>₹{s?.price}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
            {holdTimer && (
              <div style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '8px', borderRadius: '6px', fontSize: '12px', textAlign: 'center', marginBottom: '16px', fontWeight: 'bold', border: '1px solid #DBEAFE' }}>
                ⏱️ Reserved: {formatTimer(holdTimer)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' }}>
              <span>Total Amount:</span>
              <strong style={{ color: '#F84464', fontSize: '18px' }}>₹{totalPrice}</strong>
            </div>

            <button
              disabled={selectedSeatIds.length === 0}
              onClick={() => onProceedToCheckout && onProceedToCheckout({
                language: selectedLanguage,
                date: selectedDate,
                time: selectedTime,
                seats: selectedSeatIds,
                totalPrice
              })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedSeatIds.length > 0 ? '#F84464' : '#CCCCCC',
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: selectedSeatIds.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: selectedSeatIds.length > 0 ? '0 4px 12px rgba(248, 68, 100, 0.3)' : 'none'
              }}
            >
              Proceed to Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}