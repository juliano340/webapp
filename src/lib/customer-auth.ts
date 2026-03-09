import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, parseCustomerSessionToken } from "@/lib/customer-session";

export async function getAuthenticatedCustomer() {
  const store = await cookies();
  const token = store.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const parsed = parseCustomerSessionToken(token);
  if (!parsed) {
    return null;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.customerId },
    select: {
      id: true,
      phoneE164: true,
      name: true,
    },
  });

  return customer;
}
