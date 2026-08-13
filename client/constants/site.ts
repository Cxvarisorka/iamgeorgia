/** Brand-level constants. Anything shown in more than one place lives here. */

export const site = {
  name: "I'am Georgia",
  wordmark: "I'AM GEORGIA",
  tagline: "Discover Georgia Beyond the Ordinary",
  description:
    "A Georgian travel studio crafting private tours, mountain journeys, wine routes and stays across the Caucasus.",
  url: "https://iamgeorgia.travel",
  founded: 2014,
  contact: {
    email: "hello@iamgeorgia.travel",
    phone: "+995 32 255 0140",
    whatsapp: "+995 599 12 45 80",
    address: "12 Erekle II Street, Old Tbilisi, 0105 Georgia",
    hours: "Mon–Sat · 09:00–19:00 (GMT+4)",
  },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Facebook", href: "https://facebook.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "Pinterest", href: "https://pinterest.com" },
  ],
  languages: [
    { code: "EN", label: "English" },
    { code: "KA", label: "ქართული" },
    { code: "RU", label: "Русский" },
    { code: "DE", label: "Deutsch" },
  ],
} as const;

/** Trust signals reused by the header ribbon, about page and footer. */
export const credentials = [
  { value: "11 yrs", label: "Crafting journeys in Georgia" },
  { value: "4,800+", label: "Travellers hosted" },
  { value: "38", label: "Local guides & drivers" },
  { value: "4.9/5", label: "Average traveller rating" },
] as const;
