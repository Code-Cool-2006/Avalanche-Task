
import {
  hashPassword,
  verifyPassword,
} from "./utils/password.js";

const password = "MovieBooking123";

const hashed = await hashPassword(password);

console.log("Hash generated:", hashed.length > 0);
console.log(
  "Correct password:",
  await verifyPassword(password, hashed)
);
console.log(
  "Wrong password:",
  await verifyPassword("WrongPassword123", hashed)
);