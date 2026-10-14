import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getMetaBrowserIds } from "@/lib/meta-pixel";

export async function addWishlistCreator(wishlistId: string, creatorId: string) {
  // _fbp/_fbc are readable only in the browser, and the server replays them on
  // its deduplicated AddToWishlist copy so it matches as well as the pixel's.
  const { fbp, fbc } = getMetaBrowserIds();
  await api.post(ENDPOINTS.WISHLISTS.ADD_CREATOR(wishlistId), {
    creatorId,
    ...(fbp ? { metaFbp: fbp } : {}),
    ...(fbc ? { metaFbc: fbc } : {}),
  });
}
