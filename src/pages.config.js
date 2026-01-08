import AdminDashboard from './pages/AdminDashboard';
import AdminGroups from './pages/AdminGroups';
import AdminManagement from './pages/AdminManagement';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import AdminVenues from './pages/AdminVenues';
import BookingDetails from './pages/BookingDetails';
import BookingView from './pages/BookingView';
import ChatList from './pages/ChatList';
import CompanionBookings from './pages/CompanionBookings';
import CompanionDashboard from './pages/CompanionDashboard';
import Discover from './pages/Discover';
import EditProfile from './pages/EditProfile';
import GroupEvents from './pages/GroupEvents';
import KYCVerification from './pages/KYCVerification';
import LeaveReview from './pages/LeaveReview';
import ManageAvailability from './pages/ManageAvailability';
import MyBookings from './pages/MyBookings';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import Wallet from './pages/Wallet';
import Welcome from './pages/Welcome';
import ChatView from './pages/ChatView';
import PrivacySafety from './pages/PrivacySafety';
import HelpSupport from './pages/HelpSupport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminGroups": AdminGroups,
    "AdminManagement": AdminManagement,
    "AdminSettings": AdminSettings,
    "AdminUsers": AdminUsers,
    "AdminVenues": AdminVenues,
    "BookingDetails": BookingDetails,
    "BookingView": BookingView,
    "ChatList": ChatList,
    "CompanionBookings": CompanionBookings,
    "CompanionDashboard": CompanionDashboard,
    "Discover": Discover,
    "EditProfile": EditProfile,
    "GroupEvents": GroupEvents,
    "KYCVerification": KYCVerification,
    "LeaveReview": LeaveReview,
    "ManageAvailability": ManageAvailability,
    "MyBookings": MyBookings,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "Profile": Profile,
    "RoleSelection": RoleSelection,
    "TermsAcceptance": TermsAcceptance,
    "Wallet": Wallet,
    "Welcome": Welcome,
    "ChatView": ChatView,
    "PrivacySafety": PrivacySafety,
    "HelpSupport": HelpSupport,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};