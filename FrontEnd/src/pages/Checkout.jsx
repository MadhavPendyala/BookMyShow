import React, { useState } from 'react';
import Timer from '../components/Timer';
import { CreditCard, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Checkout Component
 * @param {Array<string>} selectedSeatIds - List of held seat numbers (e.g. ['D14', 'D15'])
 * @param {number} totalAmount - Total cost calculation
 * @param {string} holdExpiryTimestamp - ISO UTC string when Redis lock expires
 * @param {function} onPaymentSuccess - Callback on payment completion
 */
export default function Checkout({
  selectedSeatIds = ['D14', 'D15'],
  totalAmount = 240,
  holdExpiryTimestamp = new Date(Date.now() + 8 * 60 * 1000).toISOString(),
  onPaymentSuccess
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'SUCCESS' | 'FAILED' | null
  const [errorMessage, setErrorMessage] = useState('');

  // Generate an Idempotency Key once per checkout load
  const [idempotencyKey] = useState(() => `idempotency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const handlePayNow = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Send idempotent checkout payload to API
      const response = await fetch('/api/v1/bookings/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey, // Prevents double charges on retries
          'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
        },
        body: JSON.stringify({
          showId: 'SHOW_101',
          seatIds: selectedSeatIds,
          amount: totalAmount,
          paymentMethod: 'CREDIT_CARD'
        })
      });

      // Simulated delayed network execution for demo
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock Success Response (In production, load standard Stripe / Razorpay Web SDK modal)
      setPaymentStatus('SUCCESS');
      if (onPaymentSuccess) onPaymentSuccess({ bookingId: 'BK_882910', seats: selectedSeatIds });
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
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <CheckCircle2 size={64} color="#22c55e" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Booking Confirmed!</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
            Your tickets have been sent to your registered email address.
          </p>
          <div style={styles.summaryBox}>
            <div>Seats Reserved: <strong>{selectedSeatIds.join(', ')}</strong></div>
            <div>Booking Ref: <strong>BK_882910</strong></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Header with Hold Countdown Timer */}
        <div style={styles.headerRow}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Secure Checkout</h2>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Order Summary</span>
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
        <div style={styles.summaryBox}>
          <div style={styles.summaryRow}>
            <span>Event:</span>
            <strong>Modern Art Gala</strong>
          </div>
          <div style={styles.summaryRow}>
            <span>Selected Seats:</span>
            <strong>{selectedSeatIds.join(', ')}</strong>
          </div>
          <div style={styles.summaryRow}>
            <span>Total Payable:</span>
            <strong style={{ color: '#facc15', fontSize: '18px' }}>${totalAmount}.00</strong>
          </div>
        </div>

        {/* Credit Card Form Mock */}
        <form onSubmit={handlePayNow} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={styles.label}>Cardholder Name</label>
            <input required type="text" placeholder="John Doe" style={styles.input} />
          </div>

          <div>
            <label style={styles.label}>Card Number</label>
            <div style={{ position: 'relative' }}>
              <input required type="text" placeholder="4532 •••• •••• 8892" style={styles.input} />
              <CreditCard size={18} color="#64748b" style={{ position: 'absolute', right: '12px', top: '12px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Expiry Date</label>
              <input required type="text" placeholder="MM/YY" style={styles.input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>CVV / CVC</label>
              <input required type="password" maxLength="4" placeholder="•••" style={styles.input} />
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

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '16px' }}>
          🔒 Encrypted 256-bit payment processing with Idempotency Protection.
        </p>

      </div>
    </div>
  );
}

const styles = {
  container: {
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
    maxWidth: '520px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '16px',
    marginBottom: '20px'
  },
  summaryBox: {
    backgroundColor: '#1e293b',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#cbd5e1'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#020617',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
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
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    marginTop: '8px'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#451a03',
    border: '1px solid #78350f',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px'
  }
};