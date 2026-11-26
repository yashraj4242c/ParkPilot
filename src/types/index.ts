export type UserRole = "DRIVER" | "OWNER" | "ADMIN";

export type ParkingType =
  | "COVERED"
  | "OPEN_LOT"
  | "GARAGE"
  | "DRIVEWAY"
  | "VALET";

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentProvider = "STRIPE" | "DEV_TEST";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive?: boolean;
  createdAt: string;
}

export interface ParkingListing {
  id: string;
  ownerId?: string;
  ownerName?: string;
  title: string;
  description: string;
  addressLine: string;
  area: string;
  city: string;
  postalCode: string | null;
  parkingType: ParkingType;
  vehicleCompatibility: string | null;
  instructions?: string | null;
  pricePerHourPaise: number;
  currency: string;
  availableFromHour: number;
  availableToHour: number;
  isActive?: boolean;
  isApproved?: boolean;
  moderationNote?: string | null;
  isSample?: boolean;
  availableForWindow?: boolean;
  unavailableReason?: string | null;
  estimatedTotalPaise?: number | null;
  durationMinutes?: number | null;
  _count?: { bookings: number };
}

export interface ReservedSlot {
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export interface CancellationPolicy {
  holdDurationMinutes: number;
  freeCancellationHoursBefore: number;
  partialRefundPercent: number;
}

export interface PaymentRecord {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountPaise: number;
  refundedAmountPaise: number;
  paidAt: string | null;
  refundedAt: string | null;
}

export interface BookingRecord {
  id: string;
  reference: string;
  listingId: string;
  driverId: string;
  startTime: string;
  endTime: string;
  totalAmountPaise: number;
  currency: string;
  status: BookingStatus;
  holdExpiresAt: string | null;
  vehicleNumber: string | null;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  refundAmountPaise: number | null;
  createdAt: string;
  listing: {
    id: string;
    ownerId?: string;
    title: string;
    addressLine?: string;
    area: string;
    city: string;
    parkingType?: ParkingType;
    instructions?: string | null;
    pricePerHourPaise?: number;
  };
  driver?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  payment: PaymentRecord | null;
  cancellationPreview?: {
    eligible: boolean;
    refundAmountPaise: number;
    reason?: string;
  };
}
