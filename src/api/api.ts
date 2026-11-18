import axios from "axios";

export type SavedCartItem = {
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
