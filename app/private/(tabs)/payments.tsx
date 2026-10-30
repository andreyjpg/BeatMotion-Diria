import AdminPaymentCenter from "@/components/screens/admin/PaymentCenter";
import StudentPaymentCenter from "@/components/screens/student/PaymentCenter";
import { useActiveUser } from "@/hooks/user/UseActiveUser";

/** "Pagos" tab for students, "Cobros" (payment review) for admins. */
export default function PaymentsTab() {
  const { user } = useActiveUser();
  return user?.role === "admin" ? <AdminPaymentCenter /> : <StudentPaymentCenter />;
}
