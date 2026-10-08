import express from "express";
import { processPayment } from "../controllers/paymentController.js";

export function createPaymentRouter(requireAuth) {
  const router = express.Router();

  // POST /api/payments/process (Record payment transaction for user's booking)
  router.post("/payments/process", requireAuth, processPayment);

  return router;
}

export default createPaymentRouter;
