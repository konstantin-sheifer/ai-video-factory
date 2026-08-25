export type AuthPageLocation = Pick<Location, "origin" | "search">;

export function getAuthenticatedDestination(location: AuthPageLocation) {
  const redirectUrl = new URLSearchParams(location.search).get("redirect_url");

  if (!redirectUrl) {
    return "/dashboard";
  }

  try {
    const destination = new URL(redirectUrl, location.origin);

    if (
      destination.origin === location.origin &&
      destination.pathname !== "/sign-in" &&
      destination.pathname !== "/sign-up"
    ) {
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }
  } catch {
    // Invalid or unsafe return URLs use the authenticated dashboard fallback.
  }

  return "/dashboard";
}
