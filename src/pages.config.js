import AdminDashboard from './pages/AdminDashboard';
import AdminGroups from './pages/AdminGroups';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import AdminVenues from './pages/AdminVenues';
import BookingDetails from './pages/BookingDetails';
import BookingView from './pages/BookingView';
import ChatList from './pages/ChatList';
import CompanionDashboard from './pages/CompanionDashboard';
import Discover from './pages/Discover';
import GroupEvents from './pages/GroupEvents';
import KYCVerification from './pages/KYCVerification';
import ManageAvailability from './pages/ManageAvailability';
import MyBookings from './pages/MyBookings';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import Wallet from './pages/Wallet';
import Welcome from './pages/Welcome';
import AdminManagement from './pages/AdminManagement';
import EditProfile from './pages/EditProfile';
import Notifications from './pages/Notifications';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminGroups": AdminGroups,
    "AdminSettings": AdminSettings,
    "AdminUsers": AdminUsers,
    "AdminVenues": AdminVenues,
    "BookingDetails": BookingDetails,
    "BookingView": BookingView,
    "ChatList": ChatList,
    "CompanionDashboard": CompanionDashboard,
    "Discover": Discover,
    "GroupEvents": GroupEvents,
    "KYCVerification": KYCVerification,
    "ManageAvailability": ManageAvailability,
    "MyBookings": MyBookings,
    "Onboarding": Onboarding,
    "Profile": Profile,
    "RoleSelection": RoleSelection,
    "TermsAcceptance": TermsAcceptance,
    "Wallet": Wallet,
    "Welcome": Welcome,
    "AdminManagement": AdminManagement,
    "EditProfile": EditProfile,
    "Notifications": Notifications,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};