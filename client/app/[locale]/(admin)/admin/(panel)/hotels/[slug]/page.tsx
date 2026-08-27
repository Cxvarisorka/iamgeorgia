import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BedDouble, CalendarDays, FileText, ImageIcon, MapPin } from "lucide-react";

import {
  AdminBreadcrumbs,
  AdminContainer,
  AdminDefinitionList,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminPage";
import { Cell, DataTable, EmptyRow, Row } from "@/components/admin/DataTable";
import { HotelActions } from "@/components/admin/HotelActions";
import { HotelStatusBadge } from "@/components/admin/HotelStatusBadge";
import { BookingStatusBadge } from "@/components/admin/StatusBadge";
import { getHotel } from "@/lib/api/hotels";
import { ApiError } from "@/lib/api/client";
import { bookingsForHotel } from "@/lib/admin/metrics";
import { formatStay } from "@/lib/admin/bookings";
import { cardImage } from "@/lib/admin/hotels";
import { formatMoney } from "@/lib/money";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Property" };

/**
 * One property: the hub its sub-screens hang off.
 *
 * The route segment is called `[slug]` for historical reasons but takes the
 * hotel id or the slug interchangeably — the API accepts either. The publish
 * checklist travels with the record, so the page can show exactly what stands
 * between a draft and going on sale without a second request.
 */
export default async function AdminHotelPage({
  params,
}: PageProps<"/[locale]/admin/hotels/[slug]">) {
  const { slug } = await params;
  const { path } = await getI18n();

  let hotel;

  try {
    hotel = await getHotel(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const recent = await bookingsForHotel(hotel.id);
  const cover = cardImage(hotel.coverImage);

  const subScreens = [
    {
      href: `/admin/hotels/${hotel.id}/rooms`,
      icon: BedDouble,
      title: "Rooms & rates",
      description: `${hotel.roomTypes.length} room ${hotel.roomTypes.length === 1 ? "type" : "types"}, with their rate plans`,
    },
    {
      href: `/admin/hotels/${hotel.id}/calendar`,
      icon: CalendarDays,
      title: "Inventory & pricing",
      description: "The nightly calendar and the bulk editors",
    },
    {
      href: `/admin/hotels/${hotel.id}/images`,
      icon: ImageIcon,
      title: "Images",
      description: `${hotel.images.length} in the gallery`,
    },
    {
      href: `/admin/hotels/${hotel.id}/details`,
      icon: FileText,
      title: "Details & policies",
      description: hotel.shortDescription
        ? "Descriptions, times, policies, amenities"
        : "Descriptions and policies still to write",
    },
    {
      href: `/admin/hotels/${hotel.id}/location`,
      icon: MapPin,
      title: "Location",
      description:
        hotel.latitude !== null ? (hotel.address ?? "On the map, no address") : "Not placed on the map yet",
    },
  ];

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[{ label: "Hotels", href: path("/admin/hotels") }, { label: hotel.name }]}
      />

      <AdminPageHeader
        title={hotel.name}
        description={`${hotel.propertyType} · ${"★".repeat(hotel.starRating)}${
          hotel.destination ? ` · ${hotel.destination.name}` : ""
        }`}
        actions={hotel.status && <HotelStatusBadge status={hotel.status} />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <nav aria-label="Property sections" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subScreens.map((screen) => (
              <Link
                key={screen.href}
                href={path(screen.href)}
                className="group rounded-sm border border-line bg-surface p-4 transition-colors hover:border-ink"
              >
                <screen.icon size={18} className="text-brand-text" aria-hidden />
                <p className="mt-3 flex items-center gap-1 font-medium text-ink">
                  {screen.title}
                  <ArrowRight
                    size={14}
                    aria-hidden
                    className="opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100"
                  />
                </p>
                <p className="mt-1 text-[0.8125rem] text-muted">{screen.description}</p>
              </Link>
            ))}
          </nav>

          <AdminPanel title="Property">
            <AdminDefinitionList
              items={[
                { label: "Slug", value: hotel.slug },
                { label: "Address", value: hotel.address ?? "Not set" },
                {
                  label: "Destination",
                  value: hotel.destination ? `${hotel.destination.name} (${hotel.destination.path})` : "—",
                },
                { label: "Currency", value: hotel.currency },
                { label: "Time zone", value: hotel.timezone },
                {
                  label: "Check-in / out",
                  value: `${hotel.checkIn.from ?? "—"} / ${hotel.checkOut.until ?? "—"}`,
                },
                { label: "Supplier", value: hotel.supplier?.name ?? "Platform-managed" },
                { label: "Amenities", value: String(hotel.amenities.length) },
              ]}
            />
          </AdminPanel>

          <AdminPanel title="Room types" bodyClassName="p-0">
            <DataTable
              columns={[
                { label: "Room" },
                { label: "Sleeps", align: "end" },
                { label: "Rate plans", align: "end" },
                { label: "Status" },
              ]}
              caption="Room types on this property"
            >
              {hotel.roomTypes.length === 0 ? (
                <EmptyRow colSpan={4} message="No rooms yet. A property needs one before it can be published." />
              ) : (
                hotel.roomTypes.map((room) => (
                  <Row key={room.id}>
                    <Cell>
                      <Link
                        href={path(`/admin/hotels/${hotel.id}/rooms`)}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {room.name}
                      </Link>
                      <span className="ms-2 text-[0.75rem] text-muted">{room.code}</span>
                    </Cell>
                    <Cell align="end">{room.occupancy.max}</Cell>
                    <Cell align="end">{room.ratePlans.length}</Cell>
                    <Cell>{room.status}</Cell>
                  </Row>
                ))
              )}
            </DataTable>
          </AdminPanel>

          <AdminPanel title="Recent bookings" bodyClassName="p-0">
            <DataTable
              columns={[
                { label: "Reference" },
                { label: "Guest" },
                { label: "Stay", hideBelow: "md" },
                { label: "Status" },
                { label: "Total", align: "end" },
              ]}
              caption="Recent bookings at this property"
            >
              {recent.length === 0 ? (
                <EmptyRow colSpan={5} message="No bookings yet." />
              ) : (
                recent.map((booking) => (
                  <Row key={booking.reference}>
                    <Cell>
                      <Link
                        href={path(`/admin/bookings/${booking.reference}`)}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {booking.reference}
                      </Link>
                    </Cell>
                    <Cell>{booking.leadGuestName}</Cell>
                    <Cell hideBelow="md">
                      {formatStay(booking.checkIn, booking.checkOut, booking.nights)}
                    </Cell>
                    <Cell>
                      <BookingStatusBadge status={booking.status} />
                    </Cell>
                    <Cell align="end" className="tabular-nums">
                      {formatMoney(booking.totalCents, booking.currency)}
                    </Cell>
                  </Row>
                ))
              )}
            </DataTable>
          </AdminPanel>
        </div>

        <div className="flex flex-col gap-6">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element -- API-served
            <img src={cover} alt={hotel.name} className="aspect-[4/3] w-full rounded-sm object-cover" />
          )}

          <AdminPanel
            title="Publishing"
            description={
              hotel.publishChecklist.length === 0
                ? "Everything required is in place."
                : "What still stands between this property and going on sale."
            }
          >
            {hotel.publishChecklist.length > 0 && (
              <ul className="mb-4 space-y-2">
                {hotel.publishChecklist.map((item) => (
                  <li key={item.code} className="flex items-start gap-2 text-[0.8125rem] text-body">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                    {item.message}
                  </li>
                ))}
              </ul>
            )}
            <HotelActions hotel={hotel} />
          </AdminPanel>
        </div>
      </div>
    </AdminContainer>
  );
}
