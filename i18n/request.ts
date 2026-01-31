import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    localeCookie === "en" || localeCookie === "es" ? localeCookie : "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
