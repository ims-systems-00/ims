import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { AssetsCategoryPage } from "@/modules/assets";
import {
  ExternalAuditsListPage,
  InternalAuditsListPage,
} from "@/modules/audits";
import { BusinessPremisesListPage } from "@/modules/business-premise";
import { OrganisationDashboardPage } from "@/modules/dashboard";
import {
  FunctionalUnitDetailPage,
  FunctionalUnitsListPage,
} from "@/modules/functional-units";
import { ManagementReviewsListPage } from "@/modules/management-reviews";
import { OfisListPage } from "@/modules/ofi";
import { RisksListPage } from "@/modules/risks";
import { IncidentsListPage } from "@/modules/incidents";
import {
  CustomersListPage,
  CustomersOverviewPage,
} from "@/modules/customers";
import { CalendarPage } from "@/modules/calendar";
import { SuppliersListPage } from "@/modules/suppliers";
import { TasksListPage } from "@/modules/tasks";
import { UsersListPage } from "@/modules/users";

/**
 * Application route composition (kept outside module internals).
 * The shell wraps all application pages; modules only supply route elements.
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OrganisationDashboardPage />} />
        <Route path="functional-units" element={<FunctionalUnitsListPage />} />
        <Route
          path="functional-units/:id"
          element={<FunctionalUnitDetailPage />}
        />
        <Route path="users" element={<UsersListPage />} />
        <Route
          path="business-premises"
          element={<BusinessPremisesListPage />}
        />
        <Route path="risks" element={<RisksListPage />} />
        <Route path="tasks" element={<TasksListPage />} />
        <Route path="incidents" element={<IncidentsListPage />} />
        <Route
          path="audits"
          element={<Navigate to="/audits/internal" replace />}
        />
        <Route path="audits/internal" element={<InternalAuditsListPage />} />
        <Route path="audits/external" element={<ExternalAuditsListPage />} />
        <Route
          path="management-reviews"
          element={<ManagementReviewsListPage />}
        />
        <Route path="ofi" element={<OfisListPage />} />
        <Route path="customers" element={<CustomersListPage />} />
        <Route
          path="customers/overview"
          element={<CustomersOverviewPage />}
        />
        <Route path="suppliers" element={<SuppliersListPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route
          path="assets"
          element={<Navigate to="/assets/hardware" replace />}
        />
        <Route
          path="assets/hardware"
          element={<AssetsCategoryPage category="hardware" />}
        />
        <Route
          path="assets/software"
          element={<AssetsCategoryPage category="software" />}
        />
        <Route
          path="assets/people"
          element={<AssetsCategoryPage category="people" />}
        />
        <Route
          path="assets/premise"
          element={<AssetsCategoryPage category="premise" />}
        />
        <Route
          path="assets/information"
          element={<AssetsCategoryPage category="information" />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
