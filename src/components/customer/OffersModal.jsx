import { useState } from "react";
import { X, Sparkles, Check, Copy, Gift } from "lucide-react";
import { PROMO_CODES } from "../../data/mockCinemaData";

export default function OffersModal({ onClose }) {
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  return (
    <div className="offers-modal-backdrop" onClick={onClose}>
      <div
        className="offers-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="offers-modal-header">
          <div className="offers-title-row">
            <div className="offers-badge-icon">
              <Sparkles size={20} className="icon-amber" />
            </div>
            <div>
              <h3>Exclusive Cinema Offers & Promos</h3>
              <p>Apply these promo codes at checkout to unlock instant discounts</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close Offers"
          >
            <X size={20} />
          </button>
        </div>

        <div className="offers-modal-list">
          {PROMO_CODES.map((promo) => {
            const isCopied = copiedCode === promo.code;
            return (
              <div key={promo.code} className="offer-promo-card">
                <div className="offer-card-left">
                  <div className="offer-discount-tag">
                    {promo.type === "PERCENTAGE" ? (
                      <span className="discount-val">{promo.value}% OFF</span>
                    ) : (
                      <span className="discount-val">₹{promo.value} OFF</span>
                    )}
                  </div>
                  <div className="offer-meta">
                    <span className="offer-code-pill mono">{promo.code}</span>
                    <p className="offer-description">{promo.description}</p>
                    {promo.maxDiscount && (
                      <span className="offer-terms">Max discount up to ₹{promo.maxDiscount}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={`btn-copy-code ${isCopied ? "copied" : ""}`}
                  onClick={() => handleCopy(promo.code)}
                  title="Copy coupon code"
                >
                  {isCopied ? (
                    <>
                      <Check size={14} className="icon-emerald" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="offers-modal-footer">
          <Gift size={16} className="icon-crimson" />
          <span>Codes can be entered in the "Apply Coupon / Promo Code" field on the payment screen.</span>
        </div>
      </div>
    </div>
  );
}
