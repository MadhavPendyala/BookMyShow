import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * Timer Component for Ticket / Seat Hold Expiration
 *
 * @param {string | number | Date} expiresAt - Absolute ISO timestamp or UTC epoch time from backend
 * @param {function} onExpire - Callback triggered when countdown hits zero
 * @param {function} [onWarning] - Optional callback triggered when time is low (e.g. < 2 mins left)
 * @param {number} [warningThresholdSec=120] - Seconds remaining to trigger warning styling
 */
export default function Timer({ 
  expiresAt, 
  onExpire, 
  onWarning, 
  warningThresholdSec = 120 
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;

    const targetTime = new Date(expiresAt).getTime();

    // Function to compute exact remaining delta against system clock
    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = targetTime - now;
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      setTimeLeft(remainingSeconds);

      // Warning state threshold check
      if (remainingSeconds <= warningThresholdSec && remainingSeconds > 0) {
        setIsWarning(true);
        if (onWarning) onWarning(remainingSeconds);
      } else {
        setIsWarning(false);
      }

      // Expiry event check
      if (remainingSeconds === 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          if (onExpire) onExpire();
        }
      }
    };

    // Run initial tick immediately
    hasExpiredRef.current = false;
    updateTimer();

    // Interval tick every 1000ms
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt, warningThresholdSec, onExpire, onWarning]);

  // Format seconds -> MM:SS
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!expiresAt || timeLeft <= 0) {
    return (
      <div style={styles.expiredContainer}>
        <AlertTriangle size={16} color="#ef4444" />
        <span>Session Expired</span>
      </div>
    );
  }

  return (
    <div 
      style={{
        ...styles.container,
        ...(isWarning ? styles.warningState : styles.normalState)
      }}
    >
      <Clock 
        size={18} 
        style={{ 
          animation: isWarning ? 'pulse 1s infinite' : 'none',
          color: isWarning ? '#f59e0b' : '#3b82f6' 
        }} 
      />

      <div style={styles.textGroup}>
        <span style={styles.label}>Seats Held For</span>
        <span style={{
          ...styles.digits,
          color: isWarning ? '#fbbf24' : '#60a5fa'
        }}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Embedded Dynamic CSS for Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// Inline Style Object for Clean Modular Import
const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid',
    transition: 'all 0.3s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  normalState: {
    backgroundColor: '#1e1b4b',
    borderColor: '#3730a3',
    color: '#e0e7ff'
  },
  warningState: {
    backgroundColor: '#451a03',
    borderColor: '#78350f',
    color: '#fef3c7'
  },
  expiredContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '10px',
    backgroundColor: '#271c1c',
    border: '1px solid #7f1d1d',
    color: '#fca5a5',
    fontWeight: '600',
    fontSize: '14px'
  },
  textGroup: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1
  },
  label: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.8,
    marginBottom: '3px'
  },
  digits: {
    fontSize: '18px',
    fontWeight: '700',
    fontVariantNumeric: 'tabular-nums' // Prevents width shifting as numbers change
  }
};