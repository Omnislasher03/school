import axios from "axios";

export type SavedCartItem = {
  sku: string;
  quantity: number;
};

export type InventoryItem = {
  sku: string;
  quantity: number;
};

type CartResponse = {
  items: SavedCartItem[];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
});

export async function getCart(token: string): Promise<SavedCartItem[]> {
  const response = await api.get<CartResponse>("/user/cart", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.items;
}

export async function putCart(
  token: string,
  items: SavedCartItem[],
): Promise<void> {
  await api.put(
    "/user/cart",
    { items },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function createCheckoutToken(
  token: string,
  country: string,
): Promise<string> {
  const response = await api.post<{ token: string }>(
    "/user/checkout/token",
    { country },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data.token;
}

export async function syncXsollaInventory(
  token: string,
): Promise<InventoryItem[]> {
  const response = await api.post<{ items: InventoryItem[] }>(
    "/user/inventory/sync",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data.items;
}
