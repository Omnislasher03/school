import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
  useRef,
} from "react";
import { getCart, putCart } from "../api/api";

export type CartItem = {
  sku: string;
  name: string;
  description?: string;
  image_url?: string | null;
  is_free?: boolean;
  can_be_bought?: boolean;
  limits?: {
    per_user?: {
      total?: number;
      available?: number;
    } | null;
  } | null;
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
  ready: boolean;
  error: string | null;
  retryLoadCart: () => void;
  addToCart: (item: CartItem) => void;
  updateCartItems: (catalogItems: CartItem[]) => void;
  removeFromCart: (sku: string) => void;
  changeQuantity: (sku: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({
  children,
  token,
}: {
  children: ReactNode;
  token: string | null;
}) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const catalogItemsBySku = useRef(new Map<string, CartItem>());
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const retryLoadCart = useCallback(() => {
    setError(null);
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    let active = true;

    setReady(false);
    setError(null);

    if (!token) {
      setItems([]);
      setReady(true);
      return () => {
        active = false;
      };
    }

    getCart(token)
      .then((savedItems) => {
        if (!active) return;

        setItems(
          savedItems.map(({ sku, quantity }) => ({
            item: catalogItemsBySku.current.get(sku) ?? { sku, name: sku },
            quantity,
          })),
        );
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (!active) return;

        setError(
          cause instanceof Error ? cause.message : "Could not load cart",
        );
      });

    return () => {
      active = false;
    };
  }, [token, loadAttempt]);

  useEffect(() => {
    if (!token || !ready) return;

    const savedItems = items.map(({ item, quantity }) => ({
      sku: item.sku,
      quantity,
    }));

    let active = true;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => putCart(token, savedItems))
      .then(() => {
        if (active) setError(null);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Could not save cart",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [items, ready, token]);

  function addToCart(item: CartItem) {
    const maxQuantity = item.limits?.per_user?.available;
    if (item.can_be_bought === false || maxQuantity === 0) return;

    setItems((current) => {
      const existing = current.find((line) => line.item.sku === item.sku);

      if (existing) {
        if (maxQuantity !== undefined && existing.quantity >= maxQuantity) {
          return current;
        }

        return current.map((line) =>
          line.item.sku === item.sku
            ? { ...line, item, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [...current, { item, quantity: 1 }];
    });
  }

  const updateCartItems = useCallback((catalogItems: CartItem[]) => {
    for (const item of catalogItems) {
      catalogItemsBySku.current.set(item.sku, item);
    }

    setItems((current) =>
      current.map((line) => ({
        ...line,
        item: catalogItemsBySku.current.get(line.item.sku) ?? line.item,
      })),
    );
  }, []);

  function removeFromCart(sku: string) {
    setItems((current) => current.filter((line) => line.item.sku !== sku));
  }

  function changeQuantity(sku: string, quantity: number) {
    if (quantity < 1) return;

    setItems((current) =>
      current.map((line) => {
        if (line.item.sku !== sku) return line;

        const maxQuantity = line.item.limits?.per_user?.available;
        if (
          line.item.can_be_bought === false ||
          (maxQuantity !== undefined && quantity > maxQuantity)
        ) {
          return line;
        }

        return { ...line, quantity };
      }),
    );
  }

  return (
    <CartContext.Provider
      value={{
        items,
        ready,
        error,
        retryLoadCart,
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
  const {
    items,
    ready,
    error,
    retryLoadCart,
    removeFromCart,
    changeQuantity,
  } = useCart();
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

            {error && (
              <p className="catalog-error" role="alert">
                {error}
              </p>
            )}

            {!ready ? (
              <div className="cart-empty">
                <p>{error ? "Could not load your cart." : "Loading cart…"}</p>
                {error && (
                  <button type="button" onClick={retryLoadCart}>
                    Retry
                  </button>
                )}
              </div>
            ) : items.length === 0 ? (
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
                            disabled={
                              item.can_be_bought === false ||
                              (item.limits?.per_user?.available !== undefined &&
                                quantity >= item.limits.per_user.available)
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
