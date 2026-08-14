import React, { useState } from 'react';
import Seatmap from './components/Seatmap';
import Queue from './pages/Queue';
import Checkout from './pages/Checkout';

export default function App() {
  // Navigation Flow: 'QUEUE' -> 'SEAT_MAP' -> 'CHECKOUT'
  const [currentStep, setCurrentStep] = useState('SEAT_MAP'); 
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16' }}>
      {currentStep === 'QUEUE' && (
        <Queue 
          showId="SHOW_101" 
          onAdmitted={() => setCurrentStep('SEAT_MAP')} 
        />
      )}

      {currentStep === 'SEAT_MAP' && (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <Seatmap 
            showId="SHOW_101"
            onProceedToCheckout={(seats, price) => {
              setSelectedSeats(seats);
              setTotalAmount(price);
              setCurrentStep('CHECKOUT');
            }}
          />
        </div>
      )}

      {currentStep === 'CHECKOUT' && (
        <Checkout 
          selectedSeatIds={selectedSeats}
          totalAmount={totalAmount}
          onPaymentSuccess={() => alert('Booking complete!')}
        />
      )}
    </div>
  );
}