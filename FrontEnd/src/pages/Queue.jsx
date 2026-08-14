import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Clock, Loader2 } from 'lucide-react';

/**
 * Virtual Queue Component
 * @param {string} showId - Current show identifier
 * @param {function} onAdmitted - Callback fired when user reaches front of queue, passes queue token
 */
export default function Queue({ showId = "SHOW_101", onAdmitted }) {
  const [queueStatus, setQueueStatus] = useState({
    position: 482,
    estimatedWaitSec: 120,
    totalInQueue: 3500,
    status: 'WAITING' // 'WAITING' | 'ADMITTED'
  });

  useEffect(() => {
    // Poll queue status endpoint every 3 seconds
    const interval = setInterval(async () => {
      try {
        // Mocking API call: GET /api/v1/queue/status?showId=SHOW_101
        // In real backend, query Redis Sorted Set (ZRANK queue:SHOW_101 userId)
        setQueueStatus((prev) => {
          const nextPos = Math.max(0, prev.position - Math.floor(Math.random() * 25 + 10));
          const nextWait = Math.ceil(nextPos * 0.25);

          if (nextPos === 0) {
            clearInterval(interval);
            const mockAccessToken = "q_token_jwt_sec_992183";
            if (onAdmitted) onAdmitted(mockAccessToken);
            return { ...prev, position: 0, estimatedWaitSec: 0, status: 'ADMITTED' };
          }

          return { ...prev, position: nextPos, estimatedWaitSec: nextWait };
        });
      } catch (err) {
        console.error("Queue status check failed", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showId, onAdmitted]);

  const formatWaitTime = (seconds) => {
    if (seconds <= 0) return "Less than a minute";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div style={styles.pageOverlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <ShieldCheck size={32} color="#3b82f6" />
          <h2 style={styles.title}>Virtual Queue</h2>
          <span style={styles.badge}>High Demand Event</span>
        </div>

        <p style={styles.subtext}>
          You are now in line for <strong>Modern Art Gala (Show #101)</strong>. Please do not refresh or close this browser page.
        </p>

        {/* Dynamic Position Dashboard */}
        <div style={styles.metricsBox}>
          <div style={styles.metricItem}>
            <Users size={20} color="#94a3b8" />
            <span style={styles.metricLabel}>Your Position in Line</span>
            <span style={styles.metricValue}>#{queueStatus.position}</span>
          </div>

          <div style={styles.divider} />

          <div style={styles.metricItem}>
            <Clock size={20} color="#94a3b8" />
            <span style={styles.metricLabel}>Est. Waiting Time</span>
            <span style={styles.metricValue}>{formatWaitTime(queueStatus.estimatedWaitSec)}</span>
          </div>
        </div>

        {/* Loading Bar */}
        <div style={styles.progressTrack}>
          <div 
            style={{
              ...styles.progressBar,
              width: `${Math.min(100, Math.max(5, ((3500 - queueStatus.position) / 3500) * 100))}%`
            }} 
          />
        </div>

        <div style={styles.footerStatus}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#60a5fa' }} />
          <span>Line moving automatically... Syncing queue position.</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  pageOverlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d16',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    textAlign: 'center'
  },
  title: { fontSize: '24px', margin: 0, fontWeight: '700' },
  badge: {
    backgroundColor: '#1e1b4b',
    color: '#818cf8',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  subtext: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    lineHeight: '1.5',
    margin: '20px 0'
  },
  metricsBox: {
    display: 'flex',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    margin: '20px 0'
  },
  metricItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  metricLabel: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' },
  metricValue: { fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' },
  divider: { width: '1px', backgroundColor: '#334155' },
  progressTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.5s ease'
  },
  footerStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#64748b'
  }
};