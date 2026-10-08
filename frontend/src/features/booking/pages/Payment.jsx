import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Payment.css';

export default function Payment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      navigate('/confirmation/BK123456');
    }, 1500);
  };

  return (
    <div className="payment-container">
      <div className="payment-grid">
        <div className="payment-form-side">
          <h1 className="payment-title">Payment</h1>
          <form className="payment-form" onSubmit={(e) => e.preventDefault()}>
            <div className="input-group">
              <label>Card Number</label>
              <input type="text" placeholder="0000 0000 0000 0000" className="mono-input" />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Expiry Date</label>
                <input type="text" placeholder="MM/YY" className="mono-input" />
              </div>
              <div className="input-group">
                <label>CVV</label>
                <input type="password" placeholder="123" className="mono-input" maxLength="3" />
              </div>
            </div>
            <div className="input-group">
              <label>Cardholder Name</label>
              <input type="text" placeholder="John Doe" />
            </div>
            <button className="pay-btn" onClick={handlePay} disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Pay ₹1,120'}
            </button>
          </form>
        </div>
        
        <div className="summary-side">
          <div className="summary-card glass-panel">
            <h2 className="summary-title">Booking Summary</h2>
            <div className="summary-details">
              <div className="movie-details">
                <h3>Interstellar</h3>
                <p>IMAX 2D • English</p>
                <p>PVR: Nexus Mall</p>
                <p>Sun, 24 Oct • 06:15 PM</p>
                <p>Seats: E5, E6 (VIP)</p>
              </div>
              <div className="divider"></div>
              <div className="price-breakdown mono-text">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>₹900</span>
                </div>
                <div className="price-row">
                  <span>Convenience Fee</span>
                  <span>₹120</span>
                </div>
                <div className="price-row">
                  <span>GST (18%)</span>
                  <span>₹100</span>
                </div>
              </div>
              <div className="divider"></div>
              <div className="price-row total-row mono-text">
                <span>Total Amount</span>
                <span>₹1,120</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}