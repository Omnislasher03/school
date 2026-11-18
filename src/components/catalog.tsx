import { useEffect, useState } from "react";
import { useCart, type CartItem } from "./cart";

type Group = {
  external_id: string;
  name: string;
  children?: Group[];
};

type CatalogProps = {
  isLoggedIn: boolean;
  country: Country;
  onCountryChange: (country: Country) => void;
};

type Locale = "en" | "id";
type Country = "MY" | "US";

const projectId = import.meta.env.VITE_XSOLLA_PROJECT_ID;
const apiBase = "https://store.xsolla.com/api/v2/project";

function flattenGroups(groups: Group[]): Group[] {
  return groups.flatMap((group) => [
    group,
    ...flattenGroups(group.children ?? []),
  ]);
}

export default function Catalog({
  isLoggedIn,
  country,
  onCountryChange,
}: CatalogProps) {
  const { addToCart, updateCartItems, ready } = useCart();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemsByGroup, setItemsByGroup] = useState<Record<string, CartItem[]>>(
    {},
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>(() =>
    navigator.language.toLowerCase().startsWith("id") ? "id" : "en",
  );

  useEffect(() => {
    async function loadGroups() {
      try {
        if (!projectId) {
          throw new Error("Set VITE_XSOLLA_PROJECT_ID in .env");
        }

        const response = await fetch(
          `${apiBase}/${projectId}/items/groups?locale=${locale}`,
        );

        if (!response.ok) {
          throw new Error(`Could not load categories (${response.status}).`);
        }

        const data: { groups: Group[] } = await response.json();
        const allGroups = flattenGroups(data.groups);

        setGroups(allGroups);
        setSelectedGroup(allGroups[0]?.external_id ?? "");
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not load categories",
        );
      }
    }
    void loadGroups();
  }, [locale]);

  useEffect(() => {
    if (!projectId || groups.length === 0) return;
    let active = true;

    async function loadItems() {
      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          limit: "50",
          offset: "0",
          locale,
          country,
        });
        const groupResults = await Promise.all(
          groups.map(async (group) => {
            const response = await fetch(
              `${apiBase}/${projectId}/items/virtual_items/group/${encodeURIComponent(group.external_id)}?${query}`,
            );
            if (!response.ok) {
              throw new Error(
                `Could not load items for ${group.name} (${response.status}).`,
              );
            }

            const data: { items: CartItem[] } = await response.json();
            return { groupId: group.external_id, items: data.items };
          }),
        );
        if (!active) return;

        setItemsByGroup(
          Object.fromEntries(
            groupResults.map((result) => [result.groupId, result.items]),
          ),
        );
        updateCartItems(groupResults.flatMap((result) => result.items));
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error ? error.message : "Could not load items",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadItems();

    return () => {
      active = false;
    };
  }, [groups, locale, country, updateCartItems]);

  useEffect(() => {
    setItems(itemsByGroup[selectedGroup] ?? []);
  }, [itemsByGroup, selectedGroup]);

  return (
    <section className="catalog">
      <div className="catalog-heading">
        <div>
          <p className="catalog-eyebrow">THE ARMORY</p>
          <label className="language-picker">
            <span className="language-label">Language</span>
            <span className="language-select-wrap">
              <svg
                className="language-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
              </svg>
              <select
                className="language-select"
                value={locale}
                onChange={(event) =>
                  setLocale(event.target.value === "id" ? "id" : "en")
                }
              >
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
              <svg
                className="language-chevron"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </span>
            <span className="language-label">Pricing region</span>
            <span className="language-select-wrap">
              <select
                className="language-select"
                value={country}
                onChange={(event) =>
                  onCountryChange(event.target.value === "US" ? "US" : "MY")
                }
              >
                <option value="MY">Malaysia</option>
                <option value="US">United States</option>
              </select>
              <svg
                className="language-chevron"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </span>
          </label>
          <h2>Store</h2>
          <p className="catalog-subtitle">
            Gear up with items from the Xsolla catalog.
          </p>
        </div>
      </div>

      <nav className="catalog-categories" aria-label="Store categories">
        {groups.map((group) => (
          <button
            key={group.external_id}
            type="button"
            className="category-tab"
            onClick={() => setSelectedGroup(group.external_id)}
            aria-pressed={selectedGroup === group.external_id}
          >
            {group.name}
          </button>
        ))}
      </nav>

      {loading && <p className="catalog-message">Loading items…</p>}
      {error && (
        <p className="catalog-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="catalog-message">No items in this category yet.</p>
      )}

      <div className="catalog-grid">
        {items.map((item) => (
          <article key={item.sku} className="catalog-item">
            <div className="catalog-item-image">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} />
              ) : (
                <span className="image-placeholder">✦</span>
              )}
            </div>

            <div className="catalog-item-content">
              <p className="item-type">STARTER GEAR</p>
              <h3>{item.name}</h3>
              {item.description && (
                <p className="item-description">{item.description}</p>
              )}

              <div className="item-footer">
                <p className="item-price">
                  {item.is_free
                    ? "Free"
                    : item.price
                      ? `${item.price.amount} ${item.price.currency}`
                      : item.virtual_prices?.[0]
                        ? `${item.virtual_prices[0].amount} ${item.virtual_prices[0].name}`
                        : "See item details"}
                </p>
                <button
                  type="button"
                  className="add-cart-button"
                  onClick={() => addToCart(item)}
                  disabled={!isLoggedIn || !ready}
                  aria-label={
                    isLoggedIn
                      ? `Add ${item.name} to cart`
                      : "Log in to add items to cart"
                  }
                  title={
                    isLoggedIn ? "Add to cart" : "Log in to add items to cart"
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="cart-icon"
                  >
                    <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" />
                    <circle cx="10" cy="20" r="1.3" />
                    <circle cx="18" cy="20" r="1.3" />
                  </svg>
                </button>
                <span className="item-availability">In store</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
