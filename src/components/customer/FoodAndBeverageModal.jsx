import React, { useState, useEffect } from "react";
import {
  X,
  UtensilsCrossed,
  Plus,
  Minus,
  Sparkles,
  ChevronRight,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import {
  fetchConcessionsFromApi,
  getFoodAndBeverages,
} from "../../services/customerBookingService";

const CATEGORIES = ["ALL", "Combos", "Popcorn", "Snacks", "Beverages", "Desserts"];

export default function FoodAndBeverageModal({
  pendingBookingData,
  onProceedWithFnb,
  onSkipFnb,
  onClose,
}) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cart, setCart] = useState({}); // { [itemId]: quantity }
  const [fnbList, setFnbList] = useState([]);
  const [isLoadingFnb, setIsLoadingFnb] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchConcessionsFromApi()
      .then((items) => {
        if (isMounted) {
          setFnbList(items || []);
          setIsLoadingFnb(false);
        }
      })
      .catch((err) => {
        console.error("Error loading concessions:", err);
        if (isMounted) {
          setFnbList(getFoodAndBeverages());
          setIsLoadingFnb(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAdd = (item) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
  };

  const handleRemove = (itemId) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: current - 1,
      };
    });
  };

  const filteredItems = fnbList.filter((item) => {
    if (selectedCategory === "ALL") return true;
    return item.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Calculate cart summary
  const cartItemList = Object.entries(cart)
    .map(([id, qty]) => {
      const item = fnbList.find((f) => String(f.id) === String(id));
      return item ? { ...item, quantity: qty } : null;
    })
    .filter(Boolean);

  const fnbTotal = cartItemList.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalItemCount = cartItemList.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="fnb-modal-backdrop" onClick={onClose}>
      <div className="fnb-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fnb-modal-header">
          <div className="fnb-header-left">
            <div className="fnb-icon-badge">
              <UtensilsCrossed size={20} className="icon-crimson" />
            </div>
            <div>
              <h3>Grab a Bite!</h3>
              <p>Pre-book cinema concessions & skip concession queue at the theatre</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close Concessions"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Pills Strip */}
        <div className="fnb-category-tabs-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`fnb-category-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "Combos" && <Sparkles size={13} className="sparkle-icon" />}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="fnb-menu-scroll-container">
          <div className="fnb-items-grid">
            {filteredItems.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div key={item.id} className="fnb-item-card">
                  <div className="fnb-card-img-wrap">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="fnb-card-img"
                      loading="lazy"
                    />
                    {/* Veg / Non-Veg badge */}
                    <div
                      className={`diet-badge ${item.isVeg ? "veg" : "non-veg"}`}
                      title={item.isVeg ? "100% Vegetarian" : "Non-Vegetarian"}
                    >
                      <span className="diet-dot" />
                    </div>

                    {item.popular && (
                      <span className="bestseller-ribbon">Bestseller</span>
                    )}
                  </div>

                  <div className="fnb-card-details">
                    <h4 className="fnb-item-name">{item.name}</h4>
                    <p className="fnb-item-desc">{item.description}</p>
                    <div className="fnb-card-footer">
                      <span className="fnb-item-price">₹{item.price}</span>

                      {qty === 0 ? (
                        <button
                          type="button"
                          className="btn-fnb-add"
                          onClick={() => handleAdd(item)}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="fnb-qty-counter">
                          <button
                            type="button"
                            className="btn-qty-control"
                            onClick={() => handleRemove(item.id)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="qty-number">{qty}</span>
                          <button
                            type="button"
                            className="btn-qty-control"
                            onClick={() => handleAdd(item)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Checkout Actions Bar */}
        <div className="fnb-bottom-checkout-bar">
          <div className="fnb-cart-status">
            {totalItemCount > 0 ? (
              <div className="fnb-cart-summary-text">
                <div className="cart-badge-row">
                  <ShoppingBag size={16} className="icon-crimson" />
                  <span className="item-count">
                    {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} added
                  </span>
                </div>
                <span className="cart-amount-total">₹{fnbTotal}</span>
              </div>
            ) : (
              <div className="fnb-no-items-selected">
                <span>No snacks selected. You can add snacks or skip directly.</span>
              </div>
            )}
          </div>

          <div className="fnb-action-buttons">
            <button
              type="button"
              className="btn-fnb-skip"
              onClick={() => onSkipFnb()}
            >
              Skip
            </button>

            <button
              type="button"
              className="btn-fnb-proceed"
              onClick={() => onProceedWithFnb(cartItemList)}
            >
              <span>{totalItemCount > 0 ? "Continue with Snacks" : "Proceed to Checkout"}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
