import { notFound } from "next/navigation";

/**
 * Retired. The platform sells exactly three things — hotels, tours and
 * transfers — and this editorial section is no longer part of the public site.
 * The route answers 404 rather than being deleted so old links fail cleanly;
 * remove the directory once nothing external points here any more.
 */
export default function ExperiencesPage() {
  notFound();
}
