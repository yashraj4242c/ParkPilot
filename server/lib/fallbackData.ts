import { ParkingType, BookingStatus } from "@prisma/client";
import {
  calculateBookingPricePaise,
  isWithinOperatingHours,
} from "./pricing.js";
import { AppError } from "./errors.js";

export interface FallbackListing {
  id: string;
  title: string;
  description: string;
  addressLine: string;
  area: string;
  city: string;
  postalCode: string;
  parkingType: ParkingType;
  vehicleCompatibility: string;
  instructions: string;
  pricePerHourPaise: number;
  currency: string;
  availableFromHour: number;
  availableToHour: number;
  isActive: boolean;
  isApproved: boolean;
  isSample: boolean;
  ownerName: string;
  createdAt: string;
}

export interface FallbackBooking {
  id: string;
  bookingReference: string;
  listingId: string;
  driverId: string;
  driverEmail: string;
  driverName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalAmountPaise: number;
  holdExpiresAt?: string;
  createdAt: string;
}

export const FALLBACK_LISTINGS: FallbackListing[] = [
  {
    id: "bay-delhi-cp-01",
    title: "Connaught Place Outer Circle Valet Bay",
    description:
      "Assisted valet drop-off bay steps from Block H. Staffed entry desk handles vehicle handoff and return with 24/7 CCTV surveillance.",
    addressLine: "H-18, Outer Circle, Connaught Place",
    area: "Connaught Place",
    city: "New Delhi",
    postalCode: "110001",
    parkingType: ParkingType.VALET,
    vehicleCompatibility: "All passenger cars, sedans, SUVs",
    instructions:
      "Pull up to the ParkPilot valet stand in front of Block H and present your terminal confirmation code.",
    pricePerHourPaise: 14000,
    currency: "INR",
    availableFromHour: 8,
    availableToHour: 23,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "Capital Valet Services",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-delhi-hk-02",
    title: "Hauz Khas Village Multi-Tier Secure Lot",
    description:
      "Access-controlled basement slot located right at the entrance of HKV. Ideal for evening dining, events, and cafe visits.",
    addressLine: "Plot 12, Deer Park Entrance Lane",
    area: "Hauz Khas",
    city: "New Delhi",
    postalCode: "110016",
    parkingType: ParkingType.COVERED,
    vehicleCompatibility: "Hatchbacks, sedans, and compact SUVs",
    instructions:
      "Scan QR token at the entry boom barrier. Park in assigned slot HK-14 on Level B1.",
    pricePerHourPaise: 11000,
    currency: "INR",
    availableFromHour: 10,
    availableToHour: 24,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "South Delhi Mobility",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-delhi-cyber-03",
    title: "Cyber City DLF Phase II Covered Bay",
    description:
      "Premium covered corporate parking spot adjacent to Rapid Metro and DLF CyberHub. Automated RFID access.",
    addressLine: "Tower 10B concourse, DLF Cyber City",
    area: "DLF CyberHub / Gurugram",
    city: "Delhi NCR",
    postalCode: "122002",
    parkingType: ParkingType.COVERED,
    vehicleCompatibility: "All passenger cars",
    instructions:
      "Show digital reservation to the Tower 10 gate marshal for automated entry.",
    pricePerHourPaise: 9000,
    currency: "INR",
    availableFromHour: 6,
    availableToHour: 24,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "DLF Corporate Park Facilities",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-delhi-southex-04",
    title: "South Extension Part II Private Driveway",
    description:
      "Secure ground-level driveway off Ring Road with easy straight-in ingress and CCTV monitoring.",
    addressLine: "E-42, South Extension Part II",
    area: "South Extension",
    city: "New Delhi",
    postalCode: "110049",
    parkingType: ParkingType.DRIVEWAY,
    vehicleCompatibility: "All cars including full-size SUVs",
    instructions:
      "Ring bell at Gate 1 or verify phone number with security guard on arrival.",
    pricePerHourPaise: 8000,
    currency: "INR",
    availableFromHour: 0,
    availableToHour: 24,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "Rajesh Malhotra (Verified Host)",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-blr-100ft-01",
    title: "100 Feet Road Covered Basement Bay",
    description:
      "Dedicated basement parking space in a gated commercial building off 100 Feet Road. CCTV monitored with security guard on duty.",
    addressLine: "418, 100 Feet Road, HAL 2nd Stage",
    area: "Indiranagar",
    city: "Bengaluru",
    postalCode: "560038",
    parkingType: ParkingType.COVERED,
    vehicleCompatibility: "Hatchbacks, sedans, and compact SUVs (max height 2.0m)",
    instructions:
      "Show your booking reference at the basement ramp gate. Park in Bay B-04.",
    pricePerHourPaise: 8000,
    currency: "INR",
    availableFromHour: 6,
    availableToHour: 23,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "Indira Commercial Estates",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-blr-kora-02",
    title: "Koramangala 4th Block Private Driveway",
    description:
      "Quiet residential driveway two minutes from Sony World Signal. Easy straight entry with wide turning radius.",
    addressLine: "72, 1st Cross, 4th Block",
    area: "Koramangala",
    city: "Bengaluru",
    postalCode: "560034",
    parkingType: ParkingType.DRIVEWAY,
    vehicleCompatibility: "All cars including full-size SUVs",
    instructions:
      "Ring the intercom at Gate 2 upon arrival to unlock the sliding gate.",
    pricePerHourPaise: 6000,
    currency: "INR",
    availableFromHour: 0,
    availableToHour: 24,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "Koramangala Living Spaces",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-mum-bandra-01",
    title: "Pali Hill Secure Enclosed Garage",
    description:
      "Weather-protected private garage bay near Carter Road promenade. Ideal for long-stay evening and weekend visits.",
    addressLine: "14, Union Park Road, Pali Hill",
    area: "Bandra West",
    city: "Mumbai",
    postalCode: "400050",
    parkingType: ParkingType.GARAGE,
    vehicleCompatibility: "Sedans and compact crossovers (max length 4.6m)",
    instructions:
      "Check in with the building caretaker and quote your ParkPilot reference.",
    pricePerHourPaise: 12000,
    currency: "INR",
    availableFromHour: 7,
    availableToHour: 23,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "Pali Heritage Trust",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bay-mum-parel-02",
    title: "Lower Parel Business District Open Lot",
    description:
      "Marked surface parking bay inside an access-controlled commercial compound close to Kamala Mills.",
    addressLine: "Senapati Bapat Marg, Plot 19",
    area: "Lower Parel",
    city: "Mumbai",
    postalCode: "400013",
    parkingType: ParkingType.OPEN_LOT,
    vehicleCompatibility: "All passenger vehicles",
    instructions: "Enter from the North Gate lane and park in slot P-11.",
    pricePerHourPaise: 10000,
    currency: "INR",
    availableFromHour: 0,
    availableToHour: 24,
    isActive: true,
    isApproved: true,
    isSample: true,
    ownerName: "Mills Compound Parking Corp",
    createdAt: new Date().toISOString(),
  },
];

export const inMemoryBookings: FallbackBooking[] = [];

export function searchFallbackListings(params: {
  q?: string;
  startTime?: string;
  endTime?: string;
  parkingType?: ParkingType;
  minPricePaise?: number;
  maxPricePaise?: number;
  availableOnly?: boolean;
  sort?: string;
}) {
  let parsedStart: Date | null = null;
  let parsedEnd: Date | null = null;

  if (params.startTime && params.endTime) {
    parsedStart = new Date(params.startTime);
    parsedEnd = new Date(params.endTime);
  }

  let filtered = FALLBACK_LISTINGS.filter((item) => {
    if (!item.isActive || !item.isApproved) return false;
    if (params.parkingType && item.parkingType !== params.parkingType) return false;
    if (params.minPricePaise !== undefined && item.pricePerHourPaise < params.minPricePaise)
      return false;
    if (params.maxPricePaise !== undefined && item.pricePerHourPaise > params.maxPricePaise)
      return false;

    if (params.q) {
      const q = params.q.toLowerCase().trim();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.addressLine.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const enriched = filtered.map((listing) => {
    let availableForWindow = true;
    let unavailableReason: string | null = null;
    let estimatedTotalPaise: number | null = null;
    let durationMinutes: number | null = null;

    if (parsedStart && parsedEnd) {
      const withinHours = isWithinOperatingHours(
        parsedStart,
        parsedEnd,
        listing.availableFromHour,
        listing.availableToHour
      );
      if (!withinHours) {
        availableForWindow = false;
        unavailableReason = `Operates ${String(listing.availableFromHour).padStart(2, "0")}:00 - ${String(listing.availableToHour).padStart(2, "0")}:00 IST`;
      } else {
        const hasOverlap = inMemoryBookings.some((b) => {
          if (b.listingId !== listing.id) return false;
          if (
            b.status !== BookingStatus.PENDING_PAYMENT &&
            b.status !== BookingStatus.CONFIRMED
          )
            return false;
          return (
            new Date(b.startTime) < parsedEnd! &&
            new Date(b.endTime) > parsedStart!
          );
        });
        if (hasOverlap) {
          availableForWindow = false;
          unavailableReason = "Reserved for selected time";
        }
      }

      try {
        const calc = calculateBookingPricePaise(
          parsedStart,
          parsedEnd,
          listing.pricePerHourPaise
        );
        estimatedTotalPaise = calc.totalAmountPaise;
        durationMinutes = calc.durationMinutes;
      } catch (err) {
        availableForWindow = false;
        unavailableReason =
          err instanceof AppError ? err.message : "Invalid duration";
      }
    }

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      addressLine: listing.addressLine,
      area: listing.area,
      city: listing.city,
      postalCode: listing.postalCode,
      parkingType: listing.parkingType,
      vehicleCompatibility: listing.vehicleCompatibility,
      pricePerHourPaise: listing.pricePerHourPaise,
      currency: listing.currency,
      availableFromHour: listing.availableFromHour,
      availableToHour: listing.availableToHour,
      isSample: listing.isSample,
      ownerName: listing.ownerName,
      availableForWindow,
      unavailableReason,
      estimatedTotalPaise,
      durationMinutes,
      createdAt: listing.createdAt,
    };
  });

  if (params.availableOnly && parsedStart && parsedEnd) {
    return enriched.filter((i) => i.availableForWindow);
  }

  if (params.sort === "price_asc") {
    enriched.sort((a, b) => a.pricePerHourPaise - b.pricePerHourPaise);
  } else if (params.sort === "price_desc") {
    enriched.sort((a, b) => b.pricePerHourPaise - a.pricePerHourPaise);
  }

  return enriched;
}
