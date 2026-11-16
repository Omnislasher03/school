import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  sku: string;
  name: string;
  description?: string;
  image_url?: string | null;
  is_free?: boolean;
  price?: {
    amount: string;
    currency: string;
  };
  virtual_prices?: Array<{
    amount: number;
    name: string;
  }>;
};

export type CartLine = {
  item: CartItem;
  quantity: number;
};

type CartContextValue = {
  items: CartLine[];
  addToCart: (item: CartItem) => void;
  updateCartItems: (catalogItems: CartItem[]) => void;
  removeFromCart: (sku: string) => void;
  changeQuantity: (sku: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const CART_STORAGE_KEY = "xsolla_cart";

  const [items, setItems] = useState<CartLine[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];

    try {
      return JSON.parse(saved) as CartLine[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addToCart(item: CartItem) {
    setItems((current) => {
      const existing = current.find((line) => line.item.sku === item.sku);

      if (existing) {
        return current.map((line) =>
          line.item.sku === item.sku
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [...current, { item, quantity: 1 }];
    });
  }

  const updateCartItems = useCallback((catalogItems: CartItem[]) => {
    const latestItemsBySku = new Map(
      catalogItems.map((item) => [item.sku, item]),
    );

    setItems((current) =>
      current.map((line) => {
        const latestItem = latestItemsBySku.get(line.item.sku);
        return latestItem ? { ...line, item: latestItem } : line;
      }),
    );
  }, []);

  function removeFromCart(sku: string) {
    setItems((current) => current.filter((line) => line.item.sku !== sku));
  }

  function changeQuantity(sku: string, quantity: number) {
    if (quantity < 1) return;

    setItems((current) =>
      current.map((line) =>
        line.item.sku === sku ? { ...line, quantity } : line,
      ),
    );
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateCartItems,
        removeFromCart,
        changeQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

export default function Cart() {
  const { items, removeFromCart, changeQuantity } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const itemCount = items.reduce((total, line) => total + line.quantity, 0);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="cart-trigger"
        onClick={() => setIsOpen(true)}
        aria-label={`Open cart, ${itemCount} items`}
      >
        <svg viewBox="0 0 24 24" className="cart-icon" aria-hidden="true">
          <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" />
          <circle cx="10" cy="20" r="1.3" />
          <circle cx="18" cy="20" r="1.3" />
        </svg>
        <span>Cart</span>
        <span className="cart-count">{itemCount}</span>
      </button>

      {isOpen && (
        <div
          className="cart-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            className="cart-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <header className="cart-dialog-header">
              <h2 id="cart-title">Your cart</h2>
              <button
                type="button"
                className="cart-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close cart"
              >
                ×
              </button>
            </header>

            {items.length === 0 ? (
              <div className="cart-empty">
                <p>
                  Your cart is empty. Keep shopping to find something you like!
                </p>
                <button type="button" onClick={() => setIsOpen(false)}>
                  Back to store
                </button>
              </div>
            ) : (
              <>
                <ul className="cart-items">
                  {items.map(({ item, quantity }) => (
                    <li className="cart-line" key={item.sku}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" />
                      ) : (
                        <div
                          className="cart-line-placeholder"
                          aria-hidden="true"
                        >
                          ✦
                        </div>
                      )}

                      <div className="cart-line-info">
                        <h3>{item.name}</h3>
                        {item.description && <p>{item.description}</p>}

                        <p>
                          {item.is_free
                            ? "Free"
                            : item.price
                              ? `${item.price.amount} ${item.price.currency}`
                              : item.virtual_prices?.[0]
                                ? `${item.virtual_prices[0].amount} ${item.virtual_prices[0].name}`
                                : "Price unavailable"}
                        </p>

                        <div className="cart-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.sku, quantity - 1)
                            }
                            disabled={quantity <= 1}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>

                          <span>{quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.sku, quantity + 1)
                            }
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>

                          <button
                            type="button"
                            className="cart-remove"
                            onClick={() => removeFromCart(item.sku)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="cart-dialog-footer">
                  <button
                    type="button"
                    className="cart-continue"
                    onClick={() => setIsOpen(false)}
                  >
                    Continue shopping
                  </button>

                  <button type="button" className="cart-checkout" disabled>
                    Checkout — next step
                  </button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
