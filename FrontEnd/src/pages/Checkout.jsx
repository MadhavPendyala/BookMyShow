import React, { useState, useEffect } from 'react';
import Timer from '../components/Timer';
import { CreditCard, Lock, CheckCircle2, AlertCircle, Sun, Moon } from 'lucide-react';

export default function Checkout({
  selectedSeatIds = ['D14', 'D15'],
  totalAmount = 240,
  holdExpiryTimestamp = new Date(Date.now() + 8 * 60 * 1000).toISOString(),
  onPaymentSuccess
}) {
  // Theme Toggle State (Defaults to 'light' / BookMyShow Theme)
  const [theme, setTheme] = useState(() => localStorage.getItem('checkoutTheme') || 'light');

  useEffect(() => {
    localStorage.setItem('checkoutTheme', theme);
  }, [theme]);

  const isDark = theme === 'dark';
  const activeStyles = isDark ? darkTheme : lightTheme;

  // Normalize selectedSeatIds safely into an Array
  const safeSeatIds = Array.isArray(selectedSeatIds)
    ? selectedSeatIds
    : selectedSeatIds instanceof Set
    ? Array.from(selectedSeatIds)
    : typeof selectedSeatIds === 'string'
    ? selectedSeatIds.split(',')
    : [];

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); 
  const [errorMessage, setErrorMessage] = useState('');

  const [idempotencyKey] = useState(() => `idempotency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handlePayNow = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/bookings/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
        },
        body: JSON.stringify({
          showId: 'SHOW_101',
          seatIds: safeSeatIds,
          amount: totalAmount,
          paymentMethod: 'CREDIT_CARD'
        })
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setPaymentStatus('SUCCESS');
      if (onPaymentSuccess) onPaymentSuccess({ bookingId: 'BK_882910', seats: safeSeatIds });
    } catch (err) {
      console.error("Payment submission failed:", err);
      setPaymentStatus('FAILED');
      setErrorMessage("Payment verification failed or seat hold timed out. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === 'SUCCESS') {
    return (
      <div style={{ ...styles.container, ...activeStyles.container }}>
        <div style={{ ...styles.card, ...activeStyles.card, textAlign: 'center' }}>
          <CheckCircle2 size={64} color="#22c55e" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', color: activeStyles.textPrimary }}>Booking Confirmed!</h2>
          <p style={{ color: activeStyles.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            Your tickets have been sent to your registered email address.
          </p>
          <div style={{ ...styles.summaryBox, ...activeStyles.summaryBox }}>
            <div style={{ ...styles.summaryRow, color: activeStyles.textSecondary }}>
              <span>Seats Reserved:</span>
              <strong style={{ color: activeStyles.textPrimary }}>{safeSeatIds.join(', ')}</strong>
            </div>
            <div style={{ ...styles.summaryRow, color: activeStyles.textSecondary }}>
              <span>Booking Ref:</span>
              <strong style={{ color: activeStyles.textPrimary }}>BK_882910</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, ...activeStyles.container }}>
      
      {/* Brand Header with Theme Switcher */}
      <div style={styles.topBar}>
        <div style={styles.brandHeader}>
          <h1 style={{ ...styles.logoText, color: activeStyles.textPrimary }}>
            book<span style={styles.logoBadge}>my</span>show
          </h1>
        </div>

        {/* Theme Switch Button */}
        <button onClick={toggleTheme} style={{ ...styles.themeToggleButton, ...activeStyles.themeToggleButton }}>
          {isDark ? <Sun size={16} color="#facc15" /> : <Moon size={16} color="#475569" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <div style={{ ...styles.card, ...activeStyles.card }}>
        
        {/* Header with Hold Countdown Timer */}
        <div style={{ ...styles.headerRow, borderBottomColor: activeStyles.borderColor }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#f43f5e', fontWeight: '700' }}>Secure Checkout</h2>
            <span style={{ fontSize: '13px', color: activeStyles.textSecondary }}>Order Summary</span>
          </div>

          <Timer 
            expiresAt={holdExpiryTimestamp} 
            onExpire={() => {
              alert("Seats released! Expiry window reached.");
              window.location.reload();
            }}
          />
        </div>

        {errorMessage && (
          <div style={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selected Seats Itemized */}
        <div style={{ ...styles.summaryBox, ...activeStyles.summaryBox }}>
          <div style={{ ...styles.summaryRow, color: activeStyles.textSecondary }}>
            <span>Event:</span>
            <strong style={{ color: activeStyles.textPrimary }}>Modern Art Gala</strong>
          </div>
          <div style={{ ...styles.summaryRow, color: activeStyles.textSecondary }}>
            <span>Selected Seats:</span>
            <strong style={{ color: activeStyles.textPrimary }}>{safeSeatIds.join(', ')}</strong>
          </div>
          <div style={{ 
            ...styles.summaryRow, 
            borderTop: `1px dashed ${activeStyles.borderColor}`, 
            paddingTop: '10px', 
            marginTop: '6px' 
          }}>
            <span style={{ fontWeight: '600', color: activeStyles.textPrimary }}>Total Payable:</span>
            <strong style={{ color: '#f43f5e', fontSize: '20px' }}>₹{totalAmount}.00</strong>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handlePayNow} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ ...styles.label, color: activeStyles.textSecondary }}>Cardholder Name</label>
            <input required type="text" placeholder="John Doe" style={{ ...styles.input, ...activeStyles.input }} />
          </div>

          <div>
            <label style={{ ...styles.label, color: activeStyles.textSecondary }}>Card Number</label>
            <div style={{ position: 'relative' }}>
              <input required type="text" placeholder="4532 •••• •••• 8892" style={{ ...styles.input, ...activeStyles.input }} />
              <CreditCard size={18} color={isDark ? '#64748b' : '#94a3b8'} style={{ position: 'absolute', right: '12px', top: '12px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...styles.label, color: activeStyles.textSecondary }}>Expiry Date</label>
              <input required type="text" placeholder="MM/YY" style={{ ...styles.input, ...activeStyles.input }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...styles.label, color: activeStyles.textSecondary }}>CVV / CVC</label>
              <input required type="password" maxLength="4" placeholder="•••" style={{ ...styles.input, ...activeStyles.input }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            style={{
              ...styles.payButton,
              opacity: isProcessing ? 0.7 : 1,
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessing ? (
              'Processing Payment...'
            ) : (
              <>
                <Lock size={16} /> Pay ₹{totalAmount}.00
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '11px', color: activeStyles.textSecondary, marginTop: '16px' }}>
          🔒 Security protected with Idempotency Protection & BookMyShow Engine.
        </p>

      </div>
    </div>
  );
}

// Layout Base Styles
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    transition: 'all 0.3s ease'
  },
  topBar: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  brandHeader: {
    textAlign: 'left'
  },
  logoText: {
    fontSize: '28px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-1px'
  },
  logoBadge: {
    backgroundColor: '#f43f5e',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '2px',
    marginRight: '2px'
  },
  themeToggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    borderRadius: '16px',
    padding: '32px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    marginBottom: '20px'
  },
  summaryBox: {
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  },
  payButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#f43f5e',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    marginTop: '8px',
    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px'
  }
};

// Light Theme Variables (BookMyShow Red Light Mode)
const lightTheme = {
  container: { backgroundColor: '#f5f5f7' },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
  },
  textPrimary: '#1f2533',
  textSecondary: '#64748b',
  borderColor: '#e2e8f0',
  summaryBox: { backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' },
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#1f2533'
  },
  themeToggleButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    color: '#475569'
  }
};

// Dark Theme Variables (Cinematic Dark Mode)
const darkTheme = {
  container: { backgroundColor: '#090d16' },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  borderColor: '#1e293b',
  summaryBox: { backgroundColor: '#1e293b', border: '1px solid #334155' },
  input: {
    backgroundColor: '#020617',
    border: '1px solid #334155',
    color: '#f8fafc'
  },
  themeToggleButton: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f8fafc'
  }
};