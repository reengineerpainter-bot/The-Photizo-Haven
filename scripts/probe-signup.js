const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const root = path.join(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="(.+)"$/);
  if (m) process.env[m[1]] = m[2];
}

const prisma = new PrismaClient();

async function main() {
  const email = `probe-${Date.now()}@example.com`;
  const emailHash = require("crypto")
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");

  console.log("1. findUnique existing...");
  try {
    const existing = await prisma.user.findUnique({ where: { emailHash } });
    console.log("   ok, existing:", existing);
  } catch (e) {
    console.error("   FAIL:", e.message);
  }

  console.log("2. findFirst group...");
  try {
    const group = await prisma.group.findFirst();
    console.log("   ok, group:", group?.id ?? "none");
  } catch (e) {
    console.error("   FAIL:", e.message);
  }

  console.log("3. create user...");
  try {
    let groupId = (await prisma.group.findFirst())?.id;
    if (!groupId) {
      const g = await prisma.group.create({ data: { name: "Test" } });
      groupId = g.id;
    }

    const { encryptField, hashForLookup } = require("../src/lib/crypto/encryption");
    const user = await prisma.user.create({
      data: {
        groupId,
        fullName: "Probe User",
        phoneEncrypted: encryptField("+233501234567"),
        phoneHash: hashForLookup("+233501234567"),
        emailEncrypted: encryptField(email),
        emailHash,
        passwordHash: await bcrypt.hash("TestPass123!", 12),
        dateJoined: new Date("2024-01-01"),
        mfaSecret: "TESTSECRET",
        role: "MEMBER",
      },
    });
    console.log("   ok, user:", user.id);
    await prisma.user.delete({ where: { id: user.id } });
  } catch (e) {
    console.error("   FAIL:", e.message);
    if (e.code) console.error("   code:", e.code);
  }

  await prisma.$disconnect();
}

main();
