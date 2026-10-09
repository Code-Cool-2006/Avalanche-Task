import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle,
  Smartphone,
  ChevronLeft,
  Loader2,
  Calendar,
  MapPin,
  Ticket,
  Utensils,
  Tag,
  QrCode,
  Building,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  confirmBookingAndPay,
  applyPromoCode,
  expirePendingBooking,
} from "../../services/customerBookingService";
import { PROMO_CODES } from "../../data/mockCinemaData";

export default function PaymentModal({
  pendingBooking,
  onBack,
  onPaymentSuccess,
  onClose,
  onReservationExpired,
}) {
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "card" | "netbanking"
  const [upiOption, setUpiOption] = useState("gpay"); // "gpay" | "phonepe" | "paytm" | "qr"
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8892");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("482");
  const [cardholderName, setCardholderName] = useState("Alex Mercer");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(
    pendingBooking.applied_promo ? { code: pendingBooking.applied_promo, discount: pendingBooking.discount } : null
  );
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // 5-Minute Reservation Expiry tracking
  const calculateRemainingSeconds = () => {
    if (!pendingBooking?.lock_expires_at) return 0;
    const diff = Math.floor(
      (new Date(pendingBooking.lock_expires_at).getTime() - Date.now()) / 1000
    );
    return Math.max(0, diff);
  };

  const [timeLeft, setTimeLeft] = useState(calculateRemainingSeconds);
  const [isExpired, setIsExpired] = useState(() => calculateRemainingSeconds() <= 0);

  // Active countdown timer effect
  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        expirePendingBooking(pendingBooking.id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingBooking?.lock_expires_at, isExpired, pendingBooking?.id]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Base amounts from pending booking
  const ticketSubtotal = pendingBooking.subtotal || 0;
  const fnbSubtotal = pendingBooking.fnb_subtotal || 0;
  const convenienceFee = pendingBooking.convenience_fee || 0;

  const currentDiscount = appliedPromo?.discount || 0;
  const totalAmount = Math.max(0, ticketSubtotal + fnbSubtotal + convenienceFee - currentDiscount);

  const handleApplyPromo = (codeToApply = null) => {
    if (isExpired) return;
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError("");
    setPromoMessage("");

    if (!code) return;

    const res = applyPromoCode(code, ticketSubtotal + fnbSubtotal);
    if (res.valid) {
      setAppliedPromo({
        code: res.code,
        discount: res.discount,
        description: res.description,
      });
      setPromoMessage(res.message);
      setPromoInput("");
    } else {
      setPromoError(res.message || "Invalid coupon code");
    }
  };

  const handleRemovePromo = () => {
    if (isExpired) return;
    setAppliedPromo(null);
    setPromoMessage("");
    setPromoError("");
  };

  const handlePay = () => {
    if (isExpired || timeLeft <= 0) {
      setIsExpired(true);
      expirePendingBooking(pendingBooking.id);
      setError("Your 5-minute seat reservation has expired. Please select your seats again.");
      return;
    }

    setIsProcessing(true);
    setError("");

    setTimeout(() => {
      try {
        let paymentDesc = "Credit Card (ending in 8892)";
        if (paymentMethod === "upi") {
          paymentDesc =
            upiOption === "qr"
              ? "UPI Instant QR Scan"
              : upiOption === "gpay"
              ? "Google Pay UPI"
              : upiOption === "phonepe"
              ? "PhonePe UPI"
              : "Paytm UPI";
        } else if (paymentMethod === "netbanking") {
          paymentDesc = "Net Banking (HDFC Bank)";
        }

        const confirmedBooking = confirmBookingAndPay(pendingBooking.id, paymentDesc);
        setIsProcessing(false);
        onPaymentSuccess(confirmedBooking);
      } catch (err) {
        setIsProcessing(false);
        if (err.message && err.message.toLowerCase().includes("expired")) {
          setIsExpired(true);
        }
        setError(err.message || "Payment authorization failed.");
      }
    }, 1300);
  };

  const showDateFormatted = pendingBooking.show_time
    ? new Date(pendingBooking.show_time).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const showTimeFormatted = pendingBooking.show_time
    ? new Date(pendingBooking.show_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <div className="payment-modal-backdrop">
      <div className="payment-modal-container">
        {/* Header */}
        <div className="payment-modal-header">
          <div className="payment-header-left">
            <button
              type="button"
              className="btn-back-seats"
              onClick={onBack}
              disabled={isProcessing}
            >
              <ChevronLeft size={18} />
              <span>Back</span>
            </button>
            <h2>Checkout & Payment</h2>
          </div>

          <div className="payment-header-right-controls">
            {/* 5-Min Seat Hold Timer Badge */}
            <div className={`countdown-timer-badge ${timeLeft < 60 ? "urgent" : ""}`}>
              <Clock size={15} className="timer-icon" />
              <div className="timer-text">
                <span className="timer-label">Seat Hold:</span>
                <span className="timer-digits">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close Checkout"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 5-Minute Reservation Urgency Banner */}
        {!isExpired && (
          <div className={`payment-reservation-banner ${timeLeft < 60 ? "urgent" : ""}`}>
            <div className="banner-left">
              <Clock size={16} className="timer-icon" />
              <div className="banner-text">
                <span className="banner-title">Seats Reserved for 5 Minutes</span>
                <span className="banner-desc">
                  Time left to pay before hold is released: <strong>{formatTimer(timeLeft)}</strong>
                </span>
              </div>
            </div>
            {timeLeft < 60 && (
              <span className="banner-urgent-pill">Hurry! Expiring Soon</span>
            )}
          </div>
        )}

        {error && <div className="payment-error-alert">{error}</div>}

        {/* Expired State: When reservation times out without payment */}
        {isExpired ? (
          <div className="payment-expired-view">
            <div className="payment-expired-card">
              <div className="expired-icon-wrap">
                <AlertTriangle size={48} className="icon-expired" />
              </div>
              <div className="expired-badge">RESERVATION EXPIRED</div>
              <h3>5-Minute Seat Reservation Has Ended</h3>
              <p>
                Payment was not completed within the 5-minute reservation window.
                To ensure fairness for all moviegoers, seat(s){" "}
                <strong>
                  {pendingBooking.seats_summary?.map((s) => `${s.row}${s.number}`).join(", ")}
                </strong>{" "}
                have been automatically released back to available.
              </p>
              <div className="expired-actions">
                <button
                  type="button"
                  className="btn-expired-primary"
                  onClick={() => {
                    if (onReservationExpired) onReservationExpired();
                    else onBack();
                  }}
                >
                  Select Seats Again
                </button>
                <button
                  type="button"
                  className="btn-expired-secondary"
                  onClick={onClose}
                >
                  Return to Movies
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="payment-modal-body">
            {/* Left Column: Order Review */}
            <div className="payment-order-summary-col">
            <div className="summary-movie-card">
              <img
                src={pendingBooking.movie_poster}
                alt={pendingBooking.movie_title}
                className="summary-poster"
              />
              <div className="summary-movie-details">
                <h3>{pendingBooking.movie_title}</h3>
                <div className="summary-meta-badges">
                  <span className="badge-cert">{pendingBooking.movie_certificate || "U/A"}</span>
                  <span className="badge-format">{pendingBooking.screen_format}</span>
                </div>
                <div className="summary-info-line">
                  <MapPin size={14} className="icon-cyan" />
                  <span>{pendingBooking.theatre_name}</span>
                </div>
                <div className="summary-info-line">
                  <Calendar size={14} className="icon-cyan" />
                  <span>{showDateFormatted} at {showTimeFormatted}</span>
                </div>
                <div className="summary-info-line">
                  <Ticket size={14} className="icon-crimson" />
                  <span>
                    Seats: {pendingBooking.seats_summary?.map((s) => `${s.row}${s.number}`).join(", ")} ({pendingBooking.seat_ids?.length} Tickets)
                  </span>
                </div>
              </div>
            </div>

            {/* Food & Beverage Add-ons preview */}
            {pendingBooking.fnb_items && pendingBooking.fnb_items.length > 0 && (
              <div className="payment-fnb-summary-box">
                <div className="fnb-box-title">
                  <Utensils size={14} className="icon-amber" />
                  <span>Concessions & Snacks ({pendingBooking.fnb_items.length})</span>
                </div>
                <div className="fnb-items-pill-list">
                  {pendingBooking.fnb_items.map((item) => (
                    <div key={item.id} className="fnb-item-receipt-row">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="fnb-row-price">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Code Coupon Section */}
            <div className="payment-promo-section">
              <div className="promo-header-row">
                <Tag size={15} className="icon-crimson" />
                <span>Unlock Offers & Promo Codes</span>
              </div>

              {appliedPromo ? (
                <div className="applied-promo-card">
                  <div className="applied-promo-info">
                    <CheckCircle size={16} className="icon-emerald" />
                    <div>
                      <span className="applied-code-title">'{appliedPromo.code}' Applied</span>
                      <p className="applied-code-desc">
                        {appliedPromo.description || `Discount of ₹${appliedPromo.discount}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-promo"
                    onClick={handleRemovePromo}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="promo-input-group">
                  <input
                    type="text"
                    placeholder="Enter Coupon (e.g. BMS50, CINEPASS)..."
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="promo-input-field"
                  />
                  <button
                    type="button"
                    className="btn-apply-promo"
                    onClick={() => handleApplyPromo()}
                  >
                    Apply
                  </button>
                </div>
              )}

              {promoMessage && <div className="promo-success-text">{promoMessage}</div>}
              {promoError && <div className="promo-error-text">{promoError}</div>}

              {/* Quick voucher pill suggestions */}
              {!appliedPromo && (
                <div className="quick-vouchers-strip">
                  {PROMO_CODES.slice(0, 3).map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      className="quick-coupon-tag"
                      onClick={() => handleApplyPromo(p.code)}
                    >
                      {p.code} ({p.type === "PERCENTAGE" ? `${p.value}% OFF` : `₹${p.value} OFF`})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed Bill Breakdown */}
            <div className="payment-bill-breakdown">
              <h4>Fare Breakdown</h4>
              <div className="bill-row">
                <span>Tickets ({pendingBooking.seat_ids?.length}x)</span>
                <span>₹{ticketSubtotal}</span>
              </div>
              {fnbSubtotal > 0 && (
                <div className="bill-row">
                  <span>Food & Beverage Concessions</span>
                  <span>₹{fnbSubtotal}</span>
                </div>
              )}
              <div className="bill-row">
                <span>Convenience & Booking Fee (8%)</span>
                <span>₹{convenienceFee}</span>
              </div>
              <div className="bill-row">
                <span>Integrated GST (18% included)</span>
                <span className="text-emerald">Included</span>
              </div>
              {currentDiscount > 0 && (
                <div className="bill-row discount-row">
                  <span>Promo Coupon Discount</span>
                  <span className="text-emerald">-₹{currentDiscount}</span>
                </div>
              )}
              <div className="bill-divider" />
              <div className="bill-row bill-total">
                <span>Amount Payable</span>
                <span className="total-highlight">₹{totalAmount}</span>
              </div>
            </div>

            <div className="ssl-security-badge">
              <ShieldCheck size={18} className="icon-emerald" />
              <div>
                <strong>Safe & Secure 256-Bit Payment</strong>
                <p>Instant seat lock verification and ticket issuance.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Methods */}
          <div className="payment-form-col">
            <h4>Select Payment Option</h4>

            {/* Method Tabs */}
            <div className="payment-methods-selector">
              <button
                type="button"
                className={`method-tab ${paymentMethod === "upi" ? "active" : ""}`}
                onClick={() => setPaymentMethod("upi")}
              >
                <Smartphone size={18} />
                <span>UPI (Fastest)</span>
              </button>
              <button
                type="button"
                className={`method-tab ${paymentMethod === "card" ? "active" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard size={18} />
                <span>Credit / Debit Card</span>
              </button>
              <button
                type="button"
                className={`method-tab ${paymentMethod === "netbanking" ? "active" : ""}`}
                onClick={() => setPaymentMethod("netbanking")}
              >
                <Building size={18} />
                <span>Net Banking</span>
              </button>
            </div>

            {/* UPI Option */}
            {paymentMethod === "upi" && (
              <div className="upi-payment-container">
                <div className="upi-apps-row">
                  <button
                    type="button"
                    className={`upi-app-pill ${upiOption === "gpay" ? "active" : ""}`}
                    onClick={() => setUpiOption("gpay")}
                  >
                    <span>Google Pay</span>
                  </button>
                  <button
                    type="button"
                    className={`upi-app-pill ${upiOption === "phonepe" ? "active" : ""}`}
                    onClick={() => setUpiOption("phonepe")}
                  >
                    <span>PhonePe</span>
                  </button>
                  <button
                    type="button"
                    className={`upi-app-pill ${upiOption === "paytm" ? "active" : ""}`}
                    onClick={() => setUpiOption("paytm")}
                  >
                    <span>Paytm</span>
                  </button>
                  <button
                    type="button"
                    className={`upi-app-pill ${upiOption === "qr" ? "active" : ""}`}
                    onClick={() => setUpiOption("qr")}
                  >
                    <QrCode size={14} />
                    <span>Scan QR</span>
                  </button>
                </div>

                <div className="upi-method-card">
                  {upiOption === "qr" ? (
                    <div className="upi-qr-scanner-mock">
                      <div className="mock-qr-code">
                        <QrCode size={120} className="icon-cyan" />
                      </div>
                      <p className="qr-instruction">
                        Scan this dynamic QR code using any UPI app (GPay, PhonePe, Paytm, CRED)
                      </p>
                    </div>
                  ) : (
                    <div className="upi-id-input-box">
                      <label>Enter UPI Virtual ID (VPA)</label>
                      <input
                        type="text"
                        defaultValue="alexmercer@okhdfcbank"
                        className="credit-input"
                      />
                      <span className="upi-hint">
                        A payment request of <strong>₹{totalAmount}</strong> will be sent to your UPI app.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit / Debit Card Option */}
            {paymentMethod === "card" && (
              <div className="credit-card-form">
                <div className="cinema-visual-card">
                  <div className="card-top">
                    <span className="card-brand">CINESHOW PLATINUM</span>
                    <span className="card-chip">VISA</span>
                  </div>
                  <div className="card-number-display">{cardNumber}</div>
                  <div className="card-bottom">
                    <div>
                      <div className="card-lbl">CARDHOLDER</div>
                      <div className="card-val">{cardholderName}</div>
                    </div>
                    <div>
                      <div className="card-lbl">EXPIRES</div>
                      <div className="card-val">{cardExpiry}</div>
                    </div>
                  </div>
                </div>

                <div className="form-fields-grid">
                  <div className="form-group full-width">
                    <label>Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="credit-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="credit-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Security Code (CVV)</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="credit-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Name on Card</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="credit-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net Banking Option */}
            {paymentMethod === "netbanking" && (
              <div className="netbanking-options-grid">
                {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Bank", "Punjab National Bank"].map((bank, i) => (
                  <button
                    key={bank}
                    type="button"
                    className={`netbank-card ${i === 0 ? "active" : ""}`}
                  >
                    <Building size={16} />
                    <span>{bank}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Final Pay CTA */}
            <div className="payment-final-submit-wrap">
              <button
                type="button"
                className="btn-submit-payment"
                onClick={handlePay}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Authorizing ₹{totalAmount}...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Pay ₹{totalAmount}</span>
                  </>
                )}
              </button>
              <p className="payment-terms-notice">
                By clicking "Pay", you accept the Cinema Multiplex Terms & Conditions and Cancellation Policy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
