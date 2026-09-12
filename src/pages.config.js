import ApplicationScreening from './pages/ApplicationScreening';
import ContractorDashboard from './pages/ContractorDashboard';
import ContractorOnboarding from './pages/ContractorOnboarding';
import ContractorSubscription from './pages/ContractorSubscription';
import Dashboard from './pages/Dashboard';
import Inspection from './pages/Inspection';
import JobDetails from './pages/JobDetails';
import Jobs from './pages/Jobs';
import LandlordDashboard from './pages/LandlordDashboard';
import LandlordOnboarding from './pages/LandlordOnboarding';
import Leases from './pages/Leases';
import Maintenance from './pages/Maintenance';
import Messages from './pages/Messages';
import MoveOutDeposit from './pages/MoveOutDeposit';
import Payments from './pages/Payments';
import PostJob from './pages/PostJob';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';
import RentScore from './pages/RentScore';
import Settings from './pages/Settings';
import TenantOnboarding from './pages/TenantOnboarding';
import Welcome from './pages/Welcome';
import AddProperty from './pages/AddProperty';
import Auth from './pages/Auth';
import OAuthConsent from './pages/OAuthConsent';
import SysAdminDashboard from './pages/SysAdminDashboard';
import PageNotFound from './pages/PageNotFound';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ApplicationScreening": ApplicationScreening,
    "Auth": Auth,
    "ContractorDashboard": ContractorDashboard,
    "ContractorOnboarding": ContractorOnboarding,
    "ContractorSubscription": ContractorSubscription,
    "Dashboard": Dashboard,
    "Inspection": Inspection,
    "JobDetails": JobDetails,
    "Jobs": Jobs,
    "LandlordDashboard": LandlordDashboard,
    "LandlordOnboarding": LandlordOnboarding,
    "Leases": Leases,
    "Maintenance": Maintenance,
    "Messages": Messages,
    "MoveOutDeposit": MoveOutDeposit,
    "OAuthConsent": OAuthConsent,
    "Payments": Payments,
    "PostJob": PostJob,
    "PrivacyPolicy": PrivacyPolicy,
    "Properties": Properties,
    "MyProperties": Properties,
    "PropertyDetails": PropertyDetails,
    "RentScore": RentScore,
    "Settings": Settings,
    "SysAdminDashboard": SysAdminDashboard,
    "TenantOnboarding": TenantOnboarding,
    "Welcome": Welcome,
    "AddProperty": AddProperty,
    "EditProperty": AddProperty,
    "PageNotFound": PageNotFound,
    "NotFound": PageNotFound,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
