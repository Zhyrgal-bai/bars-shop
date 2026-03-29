import { isAdmin } from "../utils/isAdmin";

const AdminPage = () => {
  if (!isAdmin()) {
    return <div>Нет доступа</div>;
  }

  return <div>ADMIN PANEL</div>;
};

export default AdminPage;