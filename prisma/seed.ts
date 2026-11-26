import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, ParkingType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const isProd = process.env.NODE_ENV === "production";

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "ParkPilot Admin";

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          email: adminEmail.toLowerCase(),
          name: adminName,
          passwordHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });
      console.log(`Seeded admin account: ${adminEmail.toLowerCase()}`);
    } else {
      console.log(`Admin account already exists: ${adminEmail.toLowerCase()}`);
    }
  } else if (isProd) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set when running seed in production."
    );
  } else {
    console.log(
      "Skipping admin creation (ADMIN_EMAIL or ADMIN_PASSWORD not set)."
    );
  }

  const shouldSeedSamples =
    !isProd || process.env.SEED_SAMPLE_DATA === "true";

  if (!shouldSeedSamples) {
    console.log("Production mode without SEED_SAMPLE_DATA=true: skipping sample listings.");
    return;
  }

  const sampleOwnerEmail = "sample.owner@parkpilot.local";
  const sampleDriverEmail = "sample.driver@parkpilot.local";

  const sampleOwnerHash = await bcrypt.hash("SampleOwner123!", 10);
  const sampleOwner = await prisma.user.upsert({
    where: { email: sampleOwnerEmail },
    update: {},
    create: {
      email: sampleOwnerEmail,
      name: "Sample Space Owner (Dev)",
      phone: "+91 98000 00001",
      passwordHash: sampleOwnerHash,
      role: UserRole.OWNER,
      isActive: true,
    },
  });

  const sampleDriverHash = await bcrypt.hash("SampleDriver123!", 10);
  await prisma.user.upsert({
    where: { email: sampleDriverEmail },
    update: {},
    create: {
      email: sampleDriverEmail,
      name: "Sample Driver (Dev)",
      phone: "+91 98000 00002",
      passwordHash: sampleDriverHash,
      role: UserRole.DRIVER,
      isActive: true,
    },
  });

  const sampleListings: Array<{
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
    availableFromHour: number;
    availableToHour: number;
  }> = [
    {
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
      availableFromHour: 6,
      availableToHour: 23,
    },
    {
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
      availableFromHour: 0,
      availableToHour: 24,
    },
    {
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
      availableFromHour: 7,
      availableToHour: 23,
    },
    {
      title: "Lower Parel Business District Open Lot",
      description:
        "Marked surface parking bay inside an access-controlled commercial compound close to Kamala Mills.",
      addressLine: "Senapati Bapat Marg, Plot 19",
      area: "Lower Parel",
      city: "Mumbai",
      postalCode: "400013",
      parkingType: ParkingType.OPEN_LOT,
      vehicleCompatibility: "All passenger vehicles",
      instructions:
        "Enter from the North Gate lane and park in slot P-11.",
      pricePerHourPaise: 10000,
      availableFromHour: 0,
      availableToHour: 24,
    },
    {
      title: "Connaught Place Outer Circle Valet Bay",
      description:
        "Assisted valet drop-off bay steps from Block H. Staffed entry desk handles vehicle handoff and return.",
      addressLine: "H-18, Outer Circle, Connaught Place",
      area: "Connaught Place",
      city: "New Delhi",
      postalCode: "110001",
      parkingType: ParkingType.VALET,
      vehicleCompatibility: "All passenger cars",
      instructions:
        "Pull up to the ParkPilot valet stand and present your confirmation code.",
      pricePerHourPaise: 14000,
      availableFromHour: 8,
      availableToHour: 23,
    },
    {
      title: "MG Road Metro Covered Arcade Spot",
      description:
        "Shaded stilt parking bay within walking distance of MG Road Metro Station and Church Street.",
      addressLine: "29, MG Road",
      area: "MG Road",
      city: "Bengaluru",
      postalCode: "560001",
      parkingType: ParkingType.COVERED,
      vehicleCompatibility: "Hatchbacks and sedans",
      instructions:
        "Use the side service lane to enter the stilt level; bay S-02 is marked.",
      pricePerHourPaise: 9000,
      availableFromHour: 6,
      availableToHour: 22,
    },
  ];

  const existingSampleCount = await prisma.parkingListing.count({
    where: { isSample: true },
  });

  if (existingSampleCount === 0) {
    await prisma.parkingListing.createMany({
      data: sampleListings.map((item) => ({
        ...item,
        ownerId: sampleOwner.id,
        currency: "INR",
        isActive: true,
        isApproved: true,
        isSample: true,
      })),
    });
    console.log(`Seeded ${sampleListings.length} sample development listings.`);
  } else {
    console.log(
      `Sample listings already present (${existingSampleCount}); skipping.`
    );
  }
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
