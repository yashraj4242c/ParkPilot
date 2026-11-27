import type { ParkingListing, ParkingType } from "../types";

export const CLIENT_FALLBACK_LISTINGS: ParkingListing[] = [
  {
    id: "bay-delhi-cp-01",
    title: "Connaught Place Outer Circle Valet Bay",
    description:
      "Assisted valet drop-off bay steps from Block H. Staffed entry desk handles vehicle handoff and return with 24/7 CCTV surveillance.",
    addressLine: "H-18, Outer Circle, Connaught Place",
    area: "Connaught Place",
    city: "New Delhi",
    postalCode: "110001",
    parkingType: "VALET" as ParkingType,
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
    parkingType: "COVERED" as ParkingType,
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
    parkingType: "COVERED" as ParkingType,
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
    parkingType: "DRIVEWAY" as ParkingType,
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
    parkingType: "COVERED" as ParkingType,
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
    parkingType: "DRIVEWAY" as ParkingType,
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
    parkingType: "GARAGE" as ParkingType,
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
    parkingType: "OPEN_LOT" as ParkingType,
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
  },
];

export function searchClientFallbackListings(params: {
  q?: string;
  start?: Date;
  end?: Date;
  parkingType?: string;
  maxPricePaise?: number;
  availableOnly?: boolean;
  sort?: string;
}): ParkingListing[] {
  const filtered = CLIENT_FALLBACK_LISTINGS.filter((item) => {
    if (params.parkingType && item.parkingType !== params.parkingType) return false;
    if (params.maxPricePaise && item.pricePerHourPaise > params.maxPricePaise)
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

  const durationMinutes =
    params.start && params.end
      ? Math.max(30, Math.round((params.end.getTime() - params.start.getTime()) / 60000))
      : 120;
  const billableHours = Math.ceil(durationMinutes / 60);

  const mapped = filtered.map((listing) => ({
    ...listing,
    availableForWindow: true,
    unavailableReason: null,
    estimatedTotalPaise: billableHours * listing.pricePerHourPaise,
    durationMinutes,
  }));

  if (params.sort === "price_asc") {
    mapped.sort((a, b) => a.pricePerHourPaise - b.pricePerHourPaise);
  } else if (params.sort === "price_desc") {
    mapped.sort((a, b) => b.pricePerHourPaise - a.pricePerHourPaise);
  }

  return mapped;
}

export function getClientFallbackListing(id: string): ParkingListing | undefined {
  return CLIENT_FALLBACK_LISTINGS.find((l) => l.id === id);
}
