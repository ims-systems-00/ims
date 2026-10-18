import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import {
  ForgotPasswordPage,
  LoginPage,
  PostLoginMembershipGate,
  RegisterPage,
} from "@/modules/auth";
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
import { KpiObjectivesPage } from "@/modules/kpi-objectives";
import { TagsAndCategoriesPage } from "@/modules/tags-and-categories";
import {
  DocumentsPage,
  RepositoryDetailPage,
} from "@/modules/document-management";
import { ComplianceToolkitPage } from "@/modules/compliance";
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
import {
  CreateOrganisationPage,
  FlowSelectionPage,
  GoLivePage,
  MyOrganisationPage,
} from "@/modules/organisation";
import { ReportBugPage } from "@/modules/report-bug";
import { MyProfilePage, UsersListPage } from "@/modules/users";
import { OnboardingShell } from "@/shared/layout";
import { RequireAuth } from "@/security";

/**
 * Public auth entry pages + authenticated product / onboard trees.
 * Auth0 owns credentials; V5 owns login/register/forgot-password/onboard chrome.
 */
export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<PostLoginMembershipGate />}>
          <Route path="onboard" element={<OnboardingShell />}>
            <Route
              path="organisation"
              element={<CreateOrganisationPage />}
            />
            <Route path="flow-selection" element={<FlowSelectionPage />} />
            <Route path="go-live" element={<GoLivePage />} />
            <Route
              index
              element={<Navigate to="/onboard/organisation" replace />}
            />
          </Route>

          <Route element={<AppShell />}>
            <Route index element={<OrganisationDashboardPage />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="organisation" element={<MyOrganisationPage />} />
            <Route
              path="functional-units"
              element={<FunctionalUnitsListPage />}
            />
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
            <Route
              path="audits/internal"
              element={<InternalAuditsListPage />}
            />
            <Route
              path="audits/external"
              element={<ExternalAuditsListPage />}
            />
            <Route
              path="management-reviews"
              element={<ManagementReviewsListPage />}
            />
            <Route path="kpi-objectives" element={<KpiObjectivesPage />} />
            <Route
              path="tags-and-categories"
              element={<TagsAndCategoriesPage />}
            />
            <Route path="documents" element={<DocumentsPage />} />
            <Route
              path="documents/repositories/:id"
              element={<RepositoryDetailPage />}
            />
            <Route path="ofi" element={<OfisListPage />} />
            <Route
              path="compliance"
              element={<Navigate to="/compliance/ISO%209001" replace />}
            />
            <Route
              path="compliance/:toolkitName"
              element={<ComplianceToolkitPage />}
            />
            <Route path="customers" element={<CustomersListPage />} />
            <Route
              path="customers/overview"
              element={<CustomersOverviewPage />}
            />
            <Route path="suppliers" element={<SuppliersListPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="report-bug" element={<ReportBugPage />} />
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
        </Route>
      </Route>
    </Routes>
  );
}
