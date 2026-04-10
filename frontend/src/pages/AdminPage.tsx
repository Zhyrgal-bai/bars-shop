import ProductList from "../components/admin/ProductList";
import ProductForm from "../components/admin/ProductForm";
import PaymentDetailsPanel from "../components/admin/PaymentDetailsPanel";
import PromoCodesPanel from "../components/admin/PromoCodesPanel";
import OrdersPanel from "../components/admin/OrdersPanel";
import AnalyticsPanel from "../components/admin/AnalyticsPanel";

const AdminPage = () => {
  return (
    <div className="admin-page">
      <AnalyticsPanel />

      <OrdersPanel />

      <PaymentDetailsPanel />

      <PromoCodesPanel />

      <h2 className="admin-section-title">Добавить товар</h2>
      <ProductForm />

      <h2 className="admin-section-title">Товары</h2>
      <ProductList />
    </div>
  );
};

export default AdminPage;